import { app, BrowserWindow, ipcMain } from "electron";
import { add } from "@main/utils";
import path from "node:path";

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.webContents.openDevTools();

  ipcMain.handle("add", (_e, a: number, b: number) => {
    return add(a, b);
  });

  if (!app.isPackaged) {
    const url = process.env["RENDERER_URL"];
    if (!url) throw new Error("RENDERER_URL 이 정의되지 않았습니다.");
    await win.loadURL(url);
  } else {
    await win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  setInterval(() => {
    win.webContents.send("ping", new Date().toISOString());
  }, 1000);
});
