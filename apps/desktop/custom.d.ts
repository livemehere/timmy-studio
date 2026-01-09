/// <reference types="@timmy-studio/electron-utils/ipc/renderer" />

import type { IAsset } from '@/lib/studio/domains/Asset/types';

/**
 * Extend the IPC channel interfaces with app-specific channels
 */
declare module '@timmy-studio/electron-utils/ipc' {
  interface IpcInvokeChannels {
    'app:getInfo': {
      response: {
        isDev: boolean;
        isPackaged: boolean;
        version: string;
      };
    };
    'file:getPath': {
      payload: [file: File];
      response: string;
    };
    'dialog:open': {
      payload: [Electron.OpenDialogOptions];
      response: Electron.OpenDialogReturnValue;
    };
    'asset:create': {
      payload: [filePath: string];
      response: IAsset;
    };

    'ffmpeg:getPath': {
      response: string;
    };

    'export:start': {
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

    'export:frame': {
      payload: [frameRgba: Uint8Array];
      response: {
        writtenFrames: number;
      };
    };

    'export:finish': {
      payload: [
        options?: {
          audioTracks?: Array<{
            src: string;
            trimStart: number;
            trimEnd: number;
            startMs: number;
            volume: number;
          }>;
          totalDurationSec?: number;
          sampleRate?: number;
        },
      ];
      response: {
        outputPath: string;
      };
    };

    'export:audio': {
      payload: [
        options: {
          tracks: Array<{
            src: string;
            trimStart: number;
            trimEnd: number;
            startMs: number;
            volume: number;
          }>;
          totalDurationSec: number;
          sampleRate?: number;
        },
      ];
      response: {
        outputPath: string;
      };
    };

    'export:mergeWithAudio': {
      payload: [
        options: {
          videoPath: string;
          audioTracks: Array<{
            src: string;
            trimStart: number;
            trimEnd: number;
            startMs: number;
            volume: number;
          }>;
          totalDurationSec: number;
          sampleRate?: number;
        },
      ];
      response: {
        outputPath: string;
      };
    };
  }

  interface IpcSendChannels {
    'asset:update': {
      payload: [asset: IAsset];
    };

    'export:progress': {
      payload: [
        progress: {
          writtenFrames: number;
          totalFrames: number;
          percent: number;
          outputPath: string;
        },
      ];
    };

    'export:error': {
      payload: [message: string];
    };
  }
}

export {};
