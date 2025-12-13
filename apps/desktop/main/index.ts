import { app, BrowserWindow, dialog } from 'electron';
import log from 'electron-log/main';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { isDev, debug } from '@timmy-studio/electron-utils/utils/main';
import { ipc } from '@timmy-studio/electron-utils/ipc/main';
import { createWindow, setupTray } from './setup-utils';
import { checkExtensionServiceWorker } from '@main/utils/installExtension';
import { userConfigStore } from '@main/store';

import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import { ffmpegPath, ffprobePromise } from '@main/utils/ffmpeg';
import { createAssetData } from '@main/utils/ffprobe';
import { ensureFiles } from '@main/utils/file';
import { createProxy } from '@main/utils/ffmpeg/createProxy';

log.initialize();
log.info('App starting...');

console.log();

// app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
// app.commandLine.appendSwitch('enable-accelerated-video-decode');
// app.commandLine.appendSwitch('ignore-gpu-blocklist'); // Optional, but can help in some cases

app.whenReady().then(async () => {
  try {
    await installExtension([REACT_DEVELOPER_TOOLS]);
    await checkExtensionServiceWorker();
    log.info(`Added Extension: react`);
  } catch (err) {
    log.info(`Error while installing extension: ${err}`);
  }

  ensureFiles();

  debug({
    isEnabled: true,
  });
  setupTray();

  console.log('useConfigStore value', userConfigStore.store);
  const savedBounds = userConfigStore.get('bounds');

  const win = await createWindow({
    bounds: savedBounds,
  });

  win.on('moved', () => {
    const bounds = win.getBounds();
    userConfigStore.set('bounds', bounds);
  });

  win.on('resized', () => {
    const bounds = win.getBounds();
    userConfigStore.set('bounds', bounds);
  });

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow({
        bounds: savedBounds,
      });
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
  ipcFacade(win);
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

type ExportSession = {
  proc: ChildProcessWithoutNullStreams;
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  writtenFrames: number;
  frameSizeBytes: number;
};

let exportSession: ExportSession | null = null;

function sendExportProgress(win: BrowserWindow, session: ExportSession) {
  const percent =
    session.totalFrames > 0
      ? (session.writtenFrames / session.totalFrames) * 100
      : 0;

  win.webContents.send('exportVideoProgress', {
    writtenFrames: session.writtenFrames,
    totalFrames: session.totalFrames,
    percent,
    outputPath: session.outputPath,
  });
}

function failExport(win: BrowserWindow, message: string) {
  win.webContents.send('exportVideoError', message);
}

function ipcFacade(win: BrowserWindow) {
  ipc.handle('getAppInfo', () => {
    return {
      isDev: isDev(),
      isPackaged: app.isPackaged,
      version: app.getVersion(),
    };
  });

  ipc.handle('showOpenDialog', async (_, options) => {
    return await dialog.showOpenDialog(options);
  });

  ipc.handle('createAsset', async (_, filePath: string) => {
    const meta = await ffprobePromise(filePath);
    const asset = await createAssetData(meta, { createProxy: false }); // proxy 파일 생성 없이 순수, 메타데이터만 생성

    if (asset.type === 'video' && asset.isProxyReady === false) {
      // 프록시파일이 이미 존재하는 경우 true, 아닌경우, 비동기로 proxy 비디오 생성
      createProxy(filePath)
        .then((proxyFilePath) => {
          // 생성이 끝나면, 렌더러 프로세스에 업데이트된 에셋 정보를 보냄
          win.webContents.send('updateAsset', {
            ...asset,
            proxyFilePath,
            isProxyReady: true,
          });
        })
        .catch((err) => {
          log.error('[updateAsset] Failed to create proxy:', err);
        });
    }

    return asset;
  });

  ipc.handle(
    'exportVideoStart',
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
        // H.264 + yuv420p requires even dimensions. Pad when needed.
        '-vf',
        'pad=ceil(iw/2)*2:ceil(ih/2)*2',
        '-an',
        '-c:v',
        'libx264',
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
        log.error('[export] ffmpeg spawn error', err);
        failExport(win, String(err));
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8');
        // keep logs lightweight; stderr is useful for debugging export failures
        log.info(`[export] ffmpeg: ${text.trimEnd()}`);
      });

      proc.on('close', (code, signal) => {
        if (!exportSession || exportSession.proc !== proc) return;

        if (code !== 0) {
          const msg = `[export] ffmpeg exited code=${code} signal=${signal}`;
          log.error(msg);
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
      };

      sendExportProgress(win, exportSession);
      return { outputPath };
    }
  );

  ipc.handle('exportVideoFrame', async (_, frameRgba: Uint8Array) => {
    const session = exportSession;
    if (!session) throw new Error('No export in progress');

    if (frameRgba.byteLength !== session.frameSizeBytes) {
      throw new Error(
        `Invalid frame size: got ${frameRgba.byteLength}, expected ${session.frameSizeBytes}`
      );
    }

    const ok = session.proc.stdin.write(Buffer.from(frameRgba));
    if (!ok) {
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
    }

    session.writtenFrames += 1;
    sendExportProgress(win, session);
    return { writtenFrames: session.writtenFrames };
  });

  ipc.handle('exportVideoFinish', async () => {
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
