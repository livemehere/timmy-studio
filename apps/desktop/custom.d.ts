/// <reference types="@timmy-studio/electron-utils/ipc/renderer" />

/**
 * Extend the IPC channel interfaces with app-specific channels
 */
declare module '@timmy-studio/electron-utils/ipc' {
  interface IpcInvokeChannels {
    getAppInfo: {
      response: {
        isDev: boolean;
        isPackaged: boolean;
        isPreview: boolean;
        version: string;
      };
    };
  }

  interface IpcSendChannels {}
}

export {};
