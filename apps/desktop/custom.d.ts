/// <reference types="@timmy-studio/electron-utils/ipc/renderer" />

/**
 * Extend the IPC channel interfaces with app-specific channels
 */
declare module "@timmy-studio/electron-utils/ipc" {
  interface IpcInvokeChannels {
    add: {
      payload: [a: number, b: number];
      response: number;
    };
    multiply: {
      payload: [a: number, b: number];
      response: number;
    };
    hello: {
      payload: [];
      response: string;
    };
    longTask: {
      payload: [duration: number];
      response: string;
    };
  }

  interface IpcSendChannels {
    ping: {
      payload: [timestamp: string];
    };
  }
}

export {};
