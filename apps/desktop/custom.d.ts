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

    getFfmpegPath: {
      response: string;
    };

    exportVideoStart: {
      payload: [
        options: {
          width: number;
          height: number;
          fps: number;
          totalFrames: number;
        },
      ];
      response: {
        outputPath: string;
      };
    };

    exportVideoFrame: {
      payload: [frameRgba: Uint8Array];
      response: {
        writtenFrames: number;
      };
    };

    exportVideoFinish: {
      response: {
        outputPath: string;
      };
    };
  }

  interface IpcSendChannels {
    updateAsset: {
      payload: [asset: IAsset];
    };

    exportVideoProgress: {
      payload: [
        progress: {
          writtenFrames: number;
          totalFrames: number;
          percent: number;
          outputPath: string;
        },
      ];
    };

    exportVideoError: {
      payload: [message: string];
    };
  }
}

export {};
