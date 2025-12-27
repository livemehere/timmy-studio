import { app, BrowserWindow } from 'electron';
import log from 'electron-log/main';
import { debug } from '@timmy-studio/electron-utils/utils/main';
import { createWindow, setupTray } from './setup-utils';
import { checkExtensionServiceWorker } from '@main/utils/installExtension';
import { userConfigStore } from '@main/store';

import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import { ensureFiles } from '@main/utils/file';
import { registerIpcHandlers } from './ipc';

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
  registerIpcHandlers(win);
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
