import { app, BrowserWindow } from "electron";
import { add } from "./utils";

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
  });
  win.loadURL(process.env["RENDERER_URL"]);
  console.log("add", add(1, 2));
});
