import { app, BrowserWindow, ipcMain } from "electron";
import { add } from "@main/utils";
import {
  getPreloadPath,
  loadWindowUrl,
  setupDevTools,
} from "@timmy-studio/electron-utils";

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: getPreloadPath(),
    },
  });

  // 개발 모드에서만 DevTools와 단축키 설정
  setupDevTools(win);

  ipcMain.handle("add", (_e, a: number, b: number) => {
    return add(a, b);
  });

  // loadWindowUrl이 자동으로 dev/prod 환경 처리
  await loadWindowUrl(win);

  setInterval(() => {
    win.webContents.send("ping", new Date().toISOString());
  }, 1000);
});
