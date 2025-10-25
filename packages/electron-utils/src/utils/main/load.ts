import { BrowserWindow } from "electron";
import { getRendererPath } from "./path";
import { isDev } from "./is";

export async function loadWindow(
    win: BrowserWindow,
) {
const rendererPath = getRendererPath();
  if(isDev()) {  
    await win.loadURL(rendererPath);
  }else {
    /** isPreview(), isPackaged() */
    await win.loadFile(rendererPath);
  }
}