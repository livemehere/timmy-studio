import { app, dialog, type BrowserWindow } from 'electron';
import log from 'electron-log/main';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { ipc } from '@timmy-studio/electron-utils/ipc/main';
import { isDev } from '@timmy-studio/electron-utils/utils/main';
import { ffmpegPath, ffprobePromise } from '@main/utils/ffmpeg';
import { createAssetData } from '@main/utils/ffprobe';
import { createProxy } from '@main/utils/ffmpeg/createProxy';
import { createFilmstrip } from '@main/utils/ffmpeg/createFilmstrip';

type ExportSession = {
  proc: ChildProcessWithoutNullStreams;
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  writtenFrames: number;
  frameSizeBytes: number;
  startedAtMs: number;
  drainCount: number;
  drainWaitMsTotal: number;
  lastFrameAtMs: number | null;
  interFrameCount: number;
  interFrameMsTotal: number;
  interFrameMsMin: number;
  interFrameMsMax: number;
};

let exportSession: ExportSession | null = null;

function sendExportProgress(win: BrowserWindow, session: ExportSession) {
  const percent =
    session.totalFrames > 0
      ? (session.writtenFrames / session.totalFrames) * 100
      : 0;

  ipc.send(win.webContents, 'export:progress', {
    writtenFrames: session.writtenFrames,
    totalFrames: session.totalFrames,
    percent,
    outputPath: session.outputPath,
  });
}

function failExport(win: BrowserWindow, message: string) {
  ipc.send(win.webContents, 'export:error', message);
}

export function registerIpcHandlers(win: BrowserWindow) {
  ipc.handle('app:getInfo', () => {
    return {
      isDev: isDev(),
      isPackaged: app.isPackaged,
      version: app.getVersion(),
    };
  });

  ipc.handle('ffmpeg:getPath', () => {
    return ffmpegPath;
  });

  ipc.handle('dialog:open', async (_, options) => {
    return await dialog.showOpenDialog(options);
  });

  ipc.handle('asset:create', async (_, filePath: string) => {
    const meta = await ffprobePromise(filePath);
    const asset = await createAssetData(meta, { createProxy: false }); // proxy 파일 생성 없이 순수, 메타데이터만 생성

    if (asset.type === 'video' && asset.isProxyReady === false) {
      // 프록시파일이 이미 존재하는 경우 true, 아닌경우, 비동기로 proxy 비디오 생성
      createProxy(filePath)
        .then((proxyFilePath) => {
          // 생성이 끝나면, 렌더러 프로세스에 업데이트된 에셋 정보를 보냄
          win.webContents.send('asset:update', {
            ...asset,
            proxyFilePath,
            isProxyReady: true,
          });
        })
        .catch((err) => {
          log.error('[asset:update] Failed to create proxy:', err);
        });
    }

    if (asset.type === 'video' && asset.metadata.durationMs != null) {
      createFilmstrip(filePath, { durationMs: asset.metadata.durationMs })
        .then((filmstrip) => {
          win.webContents.send('asset:update', {
            ...asset,
            filmstrip,
            isFilmstripReady: true,
          });
        })
        .catch((err) => {
          log.error('[asset:update] Failed to create filmstrip:', err);
        });
    }

    return asset;
  });

  ipc.handle(
    'export:start',
    async (
      _,
      options: {
        width: number;
        height: number;
        fps: number;
        totalFrames: number;
      }
    ) => {
      if (exportSession) {
        throw new Error('Export already in progress');
      }

      const { width, height, fps, totalFrames } = options;
      if (!Number.isFinite(width) || width <= 0)
        throw new Error('Invalid width');
      if (!Number.isFinite(height) || height <= 0)
        throw new Error('Invalid height');
      if (!Number.isFinite(fps) || fps <= 0) throw new Error('Invalid fps');
      if (!Number.isFinite(totalFrames) || totalFrames < 0)
        throw new Error('Invalid totalFrames');

      const outputPath = path.join(app.getPath('downloads'), 'output.mp4');
      const frameSizeBytes = width * height * 4;

      const isMac = process.platform === 'darwin';

      const videoFilter = 'pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p';

      const encoderArgs = isMac
        ? ['-c:v', 'h264_videotoolbox', '-b:v', '8M']
        : ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23'];

      const args = [
        '-y',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgba',
        '-s:v',
        `${width}x${height}`,
        '-r',
        String(fps),
        '-i',
        'pipe:0',
        // H.264 requires even dimensions; also convert to yuv420p for compatibility.
        '-vf',
        videoFilter,
        '-an',
        ...encoderArgs,
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        outputPath,
      ];

      const proc = spawn(ffmpegPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.on('error', (err) => {
        console.error('[export] ffmpeg spawn error', err);
        failExport(win, String(err));
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8');
        console.log(`[export] ffmpeg: ${text.trimEnd()}`);
      });

      proc.on('close', (code, signal) => {
        if (!exportSession || exportSession.proc !== proc) return;

        const elapsedSec = (Date.now() - exportSession.startedAtMs) / 1000;
        const effectiveFps =
          elapsedSec > 0 ? exportSession.writtenFrames / elapsedSec : 0;

        const interCount = exportSession.interFrameCount;
        const interAvg =
          interCount > 0 ? exportSession.interFrameMsTotal / interCount : 0;
        const interMin = interCount > 0 ? exportSession.interFrameMsMin : 0;
        const interMax = interCount > 0 ? exportSession.interFrameMsMax : 0;
        console.log(
          `[export] done frames=${exportSession.writtenFrames}/${exportSession.totalFrames} elapsed=${elapsedSec.toFixed(
            2
          )}s effectiveFps=${effectiveFps.toFixed(
            2
          )} drainCount=${exportSession.drainCount} drainWaitMs=${exportSession.drainWaitMsTotal.toFixed(
            1
          )} interFrameMs(avg=${interAvg.toFixed(2)} min=${interMin.toFixed(
            2
          )} max=${interMax.toFixed(2)})`
        );

        if (code !== 0) {
          const msg = `[export] ffmpeg exited code=${code} signal=${signal}`;
          console.error(msg);
          failExport(win, msg);
        }

        exportSession = null;
      });

      exportSession = {
        proc,
        outputPath,
        width,
        height,
        fps,
        totalFrames,
        writtenFrames: 0,
        frameSizeBytes,
        startedAtMs: Date.now(),
        drainCount: 0,
        drainWaitMsTotal: 0,
        lastFrameAtMs: null,
        interFrameCount: 0,
        interFrameMsTotal: 0,
        interFrameMsMin: Number.POSITIVE_INFINITY,
        interFrameMsMax: 0,
      };

      sendExportProgress(win, exportSession);
      return { outputPath };
    }
  );

  ipc.handle('export:frame', async (_, frameRgba: Uint8Array) => {
    const session = exportSession;
    if (!session) throw new Error('No export in progress');

    const now = Date.now();
    if (session.lastFrameAtMs != null) {
      const dt = now - session.lastFrameAtMs;
      session.interFrameCount += 1;
      session.interFrameMsTotal += dt;
      session.interFrameMsMin = Math.min(session.interFrameMsMin, dt);
      session.interFrameMsMax = Math.max(session.interFrameMsMax, dt);
    }
    session.lastFrameAtMs = now;

    if (frameRgba.byteLength !== session.frameSizeBytes) {
      throw new Error(
        `Invalid frame size: got ${frameRgba.byteLength}, expected ${session.frameSizeBytes}`
      );
    }

    const ok = session.proc.stdin.write(Buffer.from(frameRgba));
    if (!ok) {
      session.drainCount += 1;
      const waitStart = Date.now();
      await new Promise<void>((resolve, reject) => {
        const onError = (err: unknown) => {
          cleanup();
          reject(err);
        };
        const onDrain = () => {
          cleanup();
          resolve();
        };
        const cleanup = () => {
          session.proc.stdin.off('error', onError);
          session.proc.stdin.off('drain', onDrain);
        };

        session.proc.stdin.on('error', onError);
        session.proc.stdin.on('drain', onDrain);
      });

      session.drainWaitMsTotal += Date.now() - waitStart;
    }

    session.writtenFrames += 1;
    sendExportProgress(win, session);
    return { writtenFrames: session.writtenFrames };
  });

  ipc.handle('export:finish', async () => {
    if (!exportSession) throw new Error('No export in progress');

    const session = exportSession;
    session.proc.stdin.end();

    if (session.proc.exitCode == null) {
      await new Promise<void>((resolve, reject) => {
        const onClose = (code: number | null) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exited with code ${code}`));
        };
        session.proc.once('close', onClose);
        session.proc.once('error', reject);
      });
    } else if (session.proc.exitCode !== 0) {
      throw new Error(`ffmpeg exited with code ${session.proc.exitCode}`);
    }

    return { outputPath: session.outputPath };
  });
}
