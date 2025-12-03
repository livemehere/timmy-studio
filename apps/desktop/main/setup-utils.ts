import {
  toExtraResourcePath,
  getPreloadPath,
  loadWindow,
} from '@timmy-studio/electron-utils/utils/main';
import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';

export function setupTray() {
  const icon = nativeImage
    .createFromPath(toExtraResourcePath('tray.png'))
    .resize({ width: 24, height: 24 });

  const tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quit',
      role: 'quit',
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  return tray;
}

export function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: getPreloadPath(),
      webSecurity: false,
    },
    frame: false,
    titleBarStyle: 'hiddenInset',
  });
  loadWindow(win, 'video-editor');
  return win;
}
