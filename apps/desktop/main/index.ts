import { app, BrowserWindow, dialog } from 'electron';
import log from 'electron-log/main';
import { isDev, debug } from '@timmy-studio/electron-utils/utils/main';
import { ipc } from '@timmy-studio/electron-utils/ipc/main';
import { createWindow, setupTray } from './setup-utils';
import { checkExtensionServiceWorker } from '@main/utils/installExtension';
import { userConfigStore } from '@main/store';

import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import { ffprobePromise } from '@main/utils/ffmpeg';
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
}
