import { app, BrowserWindow } from 'electron';
import log from 'electron-log/main';
import { isDev, debug } from '@timmy-studio/electron-utils/utils/main';
import { ipc } from '@timmy-studio/electron-utils/ipc/main';
import { createWindow, setupTray } from './setup-utils';
import { checkExtensionServiceWorker } from '@main/utils/installExtension';

const {
  default: installExtension,
  REACT_DEVELOPER_TOOLS,
} = require('electron-devtools-installer');

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

  await createWindow();
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  ipc.handle('getAppInfo', () => {
    return {
      isDev: isDev(),
      isPackaged: app.isPackaged,
      version: app.getVersion(),
    };
  });
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
