import { app, dialog, type BrowserWindow } from 'electron';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { ipc } from '@timmy-studio/electron-utils/ipc/main';
import { isDev } from '@timmy-studio/electron-utils/utils/main';
import { MediaUtils } from '@main/utils/MediaUtils';
import {
  spawnMixAudiosWithProgress,
  type AudioTrackSpec,
} from '@main/utils/AudioMixerUtils';

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
    return MediaUtils.ffmpegPath;
  });

  ipc.handle('dialog:open', async (_, options) => {
    return await dialog.showOpenDialog(options);
  });

  ipc.handle('asset:create', async (_, filePath: string) => {
    const asset = await MediaUtils.createAsset(filePath);
    MediaUtils.postProcessAssetCreation(asset)
      .then((updatedAsset) => {
        // 후속 처리가 필요없으면 반환값이 없음
        if (!updatedAsset) return;

        win.webContents.send('asset:update', updatedAsset);
      })
      .catch((e) => {
        console.error('Fail to asset post-processing', e);
      });

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

      const proc = spawn(MediaUtils.ffmpegPath, args, {
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

  ipc.handle(
    'export:audio',
    async (
      _,
      options: {
        tracks: Array<{
          src: string;
          trimStart: number;
          trimEnd: number;
          startMs: number;
          volume: number;
        }>;
        totalDurationSec: number;
        sampleRate?: number;
      }
    ) => {
      const { tracks, totalDurationSec, sampleRate = 48000 } = options;

      if (!tracks || tracks.length === 0) {
        throw new Error('No audio tracks provided');
      }

      const outputPath = path.join(
        app.getPath('downloads'),
        'output.audio.m4a'
      );

      console.log(
        `[Audio Export] Starting audio export with ${tracks.length} tracks`
      );
      console.log(`[Audio Export] Output: ${outputPath}`);
      console.log(`[Audio Export] Duration: ${totalDurationSec}s`);
      console.log(`[Audio Export] Sample Rate: ${sampleRate}Hz`);

      // Log track details for debugging
      tracks.forEach((t, idx) => {
        console.log(`[Audio Export] Track ${idx + 1}:`, {
          src: t.src.substring(0, 60) + '...',
          trim: `${t.trimStart.toFixed(2)}s - ${t.trimEnd.toFixed(2)}s`,
          startMs: `${t.startMs}ms`,
          volume: t.volume.toFixed(2),
        });
      });

      // AudioTrackSpec으로 변환
      const audioTracks: AudioTrackSpec[] = tracks.map((t) => ({
        src: t.src,
        trimStart: t.trimStart,
        trimEnd: t.trimEnd,
        startMs: t.startMs,
        volume: t.volume,
      }));

      return new Promise<{ outputPath: string }>((resolve, reject) => {
        const startTime = Date.now();
        try {
          spawnMixAudiosWithProgress(
            audioTracks,
            {
              outFile: outputPath,
              totalDurationSec,
              sampleRate,
              channelLayout: 'stereo',
              bitrateKbps: 192,
            },
            (progress) => {
              // 진행률 로그 (throttle to avoid spam)
              if (progress.progress && progress.progress % 10 < 1) {
                console.log(
                  `[Audio Export] Progress: ${progress.progress.toFixed(1)}%`
                );
              }
              // 진행률을 renderer로 전송 (선택사항)
              // win.webContents.send('audio:export:progress', progress);
            },
            () => {
              // 완료
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
              console.log(
                `[Audio Export] Success: ${outputPath} (took ${elapsed}s)`
              );
              resolve({ outputPath });
            },
            (err) => {
              // 에러
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
              console.error(
                `[Audio Export] Error after ${elapsed}s:`,
                err instanceof Error ? err.message : err
              );
              reject(err);
            }
          );
        } catch (err) {
          console.error('[Audio Export] Spawn error:', err);
          reject(err);
        }
      });
    }
  );
}
