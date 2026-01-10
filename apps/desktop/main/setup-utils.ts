import {
  toExtraResourcePath,
  getPreloadPath,
  loadWindow,
} from '@timmy-studio/electron-utils/utils/main';
import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';

interface CreateWindowOptions {
  bounds?: Electron.Rectangle;
}

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

export async function createWindow(options: CreateWindowOptions) {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    ...options.bounds,
    webPreferences: {
      preload: getPreloadPath(),
      webSecurity: false,
      nodeIntegrationInWorker: true,
      backgroundThrottling: false,
      zoomFactor: 1,
    },
    frame: false,
    titleBarStyle: 'hiddenInset',
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(1); // cmd+ +/- 를 초기화
  });
  await loadWindow(win, 'video-editor');

  return win;
}
