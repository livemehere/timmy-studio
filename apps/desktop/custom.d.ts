/// <reference types="@timmy-studio/electron-utils/ipc/renderer" />

import type { IAsset } from '@renderer/lib/studio/types/asset';

/**
 * Extend the IPC channel interfaces with app-specific channels
 */
declare module '@timmy-studio/electron-utils/ipc' {
  interface IpcInvokeChannels {
    getAppInfo: {
      response: {
        isDev: boolean;
        isPackaged: boolean;
        version: string;
      };
    };
    getFilePath: {
      payload: [file: File];
      response: string;
    };
    showOpenDialog: {
      payload: [Electron.OpenDialogOptions];
      response: Electron.OpenDialogReturnValue;
    };
    createAsset: {
      payload: [filePath: string];
      response: IAsset;
    };
  }

  interface IpcSendChannels {}
}

export {};
