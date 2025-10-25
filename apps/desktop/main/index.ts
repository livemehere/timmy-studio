import { app, BrowserWindow } from 'electron';
import { add } from '@main/utils';
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

console.log('isDev:', isDev());
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('ELECTRON_PREVIEW:', process.env['ELECTRON_PREVIEW']);
console.log('isPreview():', isPreview());
console.log('isPackaged():', isPackaged());

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

  loadWindow(win);

  // 개발 모드에서만 DevTools와 단축키 설정

  // Type-safe IPC handlers - 파라미터와 리턴 타입이 자동으로 추론됨
  ipc.handle('add', (_e, a, b) => {
    return add(a, b);
  });

  ipc.handle('multiply', (_e, a, b) => {
    return a * b;
  });

  ipc.handle('hello', () => {
    return '1';
  });

  // Type-safe IPC send - 파라미터 타입이 자동으로 추론됨
  setInterval(() => {
    ipc.send(win.webContents, 'ping', new Date().toISOString());
  }, 1000);
});
