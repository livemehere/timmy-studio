import type { BrowserWindow } from 'electron';

export type MainIpcContext = {
  win: BrowserWindow;
};
