import {
  ipcMain,
  type IpcMainInvokeEvent,
  type WebContents,
} from "electron";
import type { IpcInvokeChannels, IpcSendChannels } from "./types";

type ExtractPayload<T> = T extends { payload: infer P } ? P : never;

/**
 * Cancellation context for IPC handlers
 */
export interface CancellationContext {
  isCancelled: () => boolean;
  onCancel: (callback: () => void) => void;
}

/**
 * Type-safe IPC helpers for main process
 */
export const ipc = {
  /**
   * Register a typed IPC handler
   * @example
   * ipc.handle('add', (_e, a, b) => a + b)
   */
  handle<K extends keyof IpcInvokeChannels>(
    channel: K,
    handler: (
      event: IpcMainInvokeEvent,
      ...args: ExtractPayload<IpcInvokeChannels[K]> extends readonly [...infer P]
        ? P
        : never
    ) =>
      | IpcInvokeChannels[K]["response"]
      | Promise<IpcInvokeChannels[K]["response"]>
  ) {
    ipcMain.handle(channel as string, handler as any);
  },

  /**
   * Register a cancellable typed IPC handler
   * @example
   * ipc.handleCancellable('longTask', async (_e, ctx, params) => {
   *   for (let i = 0; i < 1000; i++) {
   *     if (ctx.isCancelled()) {
   *       throw new Error('CANCELLED');
   *     }
   *     await doWork();
   *   }
   *   return result;
   * })
   */
  handleCancellable<K extends keyof IpcInvokeChannels>(
    channel: K,
    handler: (
      event: IpcMainInvokeEvent,
      ctx: CancellationContext,
      ...args: ExtractPayload<IpcInvokeChannels[K]> extends readonly [...infer P]
        ? P
        : never
    ) =>
      | IpcInvokeChannels[K]["response"]
      | Promise<IpcInvokeChannels[K]["response"]>
  ) {
    ipcMain.handle(channel as string, async (event, payload: any) => {
      let cancelled = false;
      const cancelCallbacks: Array<() => void> = [];

      const ctx: CancellationContext = {
        isCancelled: () => cancelled,
        onCancel: (callback) => {
          if (cancelled) {
            callback();
          } else {
            cancelCallbacks.push(callback);
          }
        },
      };

      // Listen for cancellation
      const cancelChannel = payload?.cancelChannel;
      if (cancelChannel) {
        const cancelListener = () => {
          cancelled = true;
          cancelCallbacks.forEach((cb) => cb());
          ipcMain.removeListener(cancelChannel, cancelListener);
        };
        ipcMain.once(cancelChannel, cancelListener);
      }

      const args = payload?.args || [];
      return handler(event, ctx, ...(args as any));
    });
  },

  /**
   * Send a typed IPC message to renderer
   * @example
   * ipc.send(win.webContents, 'ping', new Date().toISOString())
   */
  send<K extends keyof IpcSendChannels>(
    webContents: WebContents,
    channel: K,
    ...args: ExtractPayload<IpcSendChannels[K]> extends readonly [...infer P]
      ? P
      : never
  ) {
    webContents.send(channel as string, ...args);
  },
};
