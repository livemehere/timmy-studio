import { BrowserWindow } from 'electron';
import { getRendererPath } from './path';
import { isDev } from './is';

export async function loadWindow(win: BrowserWindow, route?: string) {
  const rendererPath = getRendererPath();
  if (isDev()) {
    await win.loadURL(`${rendererPath}#${route || ''}`);
  } else {
    /** isPackaged() */
    await win.loadFile(rendererPath, { hash: route });
  }
}
