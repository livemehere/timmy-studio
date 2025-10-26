import { app, BrowserWindow } from 'electron';
import log from 'electron-log/main';
import {
  getPreloadPath,
  isDev,
  setupSessionSecurity,
  debug,
  loadWindow,
} from '@timmy-studio/electron-utils/utils/main';
import { ipc } from '@timmy-studio/electron-utils/ipc/main';

log.initialize();
log.info('App starting...', process.argv);
app.whenReady().then(async () => {
  setupSessionSecurity();
  debug({
    isEnabled: true,
  });

  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: getPreloadPath(),
    },
    frame: false,
    titleBarStyle: 'hiddenInset',
  });

  ipc.handle('getAppInfo', () => {
    return {
      isDev: isDev(),
      isPackaged: app.isPackaged,
      version: app.getVersion(),
    };
  });

  loadWindow(win);
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
