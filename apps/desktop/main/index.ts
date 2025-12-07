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

log.initialize();
log.info('App starting...');

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
  ipcFasade();
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

function ipcFasade() {
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

  ipc.handle('getMediaMetadata', (_, filePath: string) => {
    return ffprobePromise(filePath);
  });
}
