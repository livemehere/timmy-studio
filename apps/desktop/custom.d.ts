/// <reference types="@timmy-studio/electron-utils/ipc/renderer" />

import type { FfprobeData } from 'fluent-ffmpeg';

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
    getMediaMetadata: {
      payload: [filePath: string];
      response: FfprobeData;
    };
  }

  interface IpcSendChannels {}
}

export {};
