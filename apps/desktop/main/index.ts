import { app, BrowserWindow } from "electron";
import { add } from "@main/utils";
import {
  getPreloadPath,
  loadWindowUrl,
  setupDevTools,
} from "@timmy-studio/electron-utils";
import { ipc } from "@timmy-studio/electron-utils/ipc";

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

  // Type-safe IPC handlers - 파라미터와 리턴 타입이 자동으로 추론됨
  ipc.handle("add", (_e, a, b) => {
    return add(a, b);
  });

  ipc.handle("hello", () => {
    return "1";
  });

  // loadWindowUrl이 자동으로 dev/prod 환경 처리
  await loadWindowUrl(win);

  // Type-safe IPC send - 파라미터 타입이 자동으로 추론됨
  setInterval(() => {
    ipc.send(win.webContents, "ping", new Date().toISOString());
  }, 1000);
});
