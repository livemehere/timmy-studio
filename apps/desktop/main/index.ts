import { app, BrowserWindow } from 'electron';
import {
  getPreloadPath,
  isDev,
  setupSessionSecurity,
  debug,
  isPreview,
  isPackaged,
  loadWindow,
} from '@timmy-studio/electron-utils/utils/main';
import { ipc } from '@timmy-studio/electron-utils/ipc/main';

app.whenReady().then(async () => {
  setupSessionSecurity();
  debug();

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
      isPackaged: isPackaged(),
      isPreview: isPreview(),
      version: app.getVersion(),
    };
  });

  loadWindow(win);
});
