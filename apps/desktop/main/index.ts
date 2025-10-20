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
  ipcMain.handle("add", (e, a: number, b: number) => {
    return add(a, b);
  });
  await win.loadURL(process.env["RENDERER_URL"]);

  setInterval(() => {
    win.webContents.send("ping", new Date().toISOString());
  }, 1000);
});
