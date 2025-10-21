import { ipcRenderer, type IpcRendererEvent } from "electron";
import type { IpcInvokeChannels, IpcSendChannels } from "./types";

type AnyListener = (...args: any[]) => void;
type WrappedListener = (event: IpcRendererEvent, ...args: any[]) => void;
type ExtractPayload<T> = T extends { payload: infer P } ? P : never;

const listeners = new Map<string, Map<AnyListener, WrappedListener>>();

/**
 * Cancellable IPC invoke result
 */
export interface CancellablePromise<T> extends Promise<T> {
  cancel: () => void;
}

/**
 * Batch invoke request
 */
export type BatchInvokeRequest = {
  [K in keyof IpcInvokeChannels]: {
    channel: K;
    args: ExtractPayload<IpcInvokeChannels[K]> extends readonly [...infer P]
      ? P
      : never;
  };
}[keyof IpcInvokeChannels];

/**
 * Batch invoke result
 */
export type BatchInvokeResult<T extends readonly BatchInvokeRequest[]> = {
  [K in keyof T]: T[K] extends { channel: infer C }
    ? C extends keyof IpcInvokeChannels
      ? IpcInvokeChannels[C]["response"]
      : never
    : never;
};

/**
 * Type-safe app interface for preload script
 * Use this to expose IPC methods to renderer process
 *
 * @example
 * ```typescript
 * // In preload script:
 * import { contextBridge } from 'electron';
 * import { createAppApi } from '@timmy-studio/electron-utils/ipc';
 *
 * const app = createAppApi();
 * contextBridge.exposeInMainWorld('app', app);
 * ```
 */
export function createAppApi() {
  return {
    /**
     * Invoke a typed IPC handler in main process
     * @example
     * const result = await app.invoke('add', 2, 3) // result: number
     */
    invoke<K extends keyof IpcInvokeChannels>(
      channel: K,
      ...args: ExtractPayload<IpcInvokeChannels[K]> extends readonly [
        ...infer P,
      ]
        ? P
        : never
    ): Promise<IpcInvokeChannels[K]["response"]> {
      return ipcRenderer.invoke(channel as string, ...args);
    },

    /**
     * Invoke a typed IPC handler with cancellation support
     * @example
     * const promise = app.cancellableInvoke('longTask', params)
     * promise.cancel() // Cancel the request
     * const result = await promise // Will reject with 'CANCELLED' if cancelled
     * FIXME: 캔슬 안됨.
     */
    cancellableInvoke<K extends keyof IpcInvokeChannels>(
      channel: K,
      ...args: ExtractPayload<IpcInvokeChannels[K]> extends readonly [
        ...infer P,
      ]
        ? P
        : never
    ): CancellablePromise<IpcInvokeChannels[K]["response"]> {
      let cancelled = false;
      const cancelChannel = `${channel as string}:cancel:${Date.now()}`;

      const promise = ipcRenderer.invoke(channel as string, {
        args,
        cancelChannel,
      }) as Promise<IpcInvokeChannels[K]["response"]>;

      const wrappedPromise = promise.then(
        (result) => {
          if (cancelled) {
            throw new Error("CANCELLED");
          }
          return result;
        },
        (error) => {
          if (cancelled) {
            throw new Error("CANCELLED");
          }
          throw error;
        },
      );

      // Create a proper cancellable promise by adding cancel method
      const cancellablePromise = Object.assign(wrappedPromise, {
        cancel: () => {
          cancelled = true;
          ipcRenderer.send(cancelChannel);
        },
      }) as CancellablePromise<IpcInvokeChannels[K]["response"]>;

      return cancellablePromise;
    },

    /**
     * Invoke multiple IPC handlers in a single batch
     * @example
     * const [sum, product] = await app.batchInvoke([
     *   { channel: 'add', args: [2, 3] },
     *   { channel: 'multiply', args: [4, 5] }
     * ] as const)
     */
    async batchInvoke<T extends readonly BatchInvokeRequest[]>(
      requests: [...T],
    ): Promise<BatchInvokeResult<T>> {
      const promises = requests.map((req: any) =>
        ipcRenderer.invoke(req.channel as string, ...(req.args as any[])),
      );
      return (await Promise.all(promises)) as BatchInvokeResult<T>;
    },

    /**
     * Listen to typed IPC messages from main process
     * @example
     * const unsubscribe = app.on('ping', (timestamp) => console.log(timestamp))
     * @returns Unsubscribe function
     */
    on<K extends keyof IpcSendChannels>(
      channel: K,
      listener: (
        ...args: ExtractPayload<IpcSendChannels[K]> extends readonly [
          ...infer P,
        ]
          ? P
          : never
      ) => void,
    ) {
      const listenerMap =
        listeners.get(channel as string) ||
        new Map<AnyListener, WrappedListener>();
      const wrapped: WrappedListener = (_e: IpcRendererEvent, ...args: any[]) =>
        listener(...(args as any));
      listenerMap.set(listener, wrapped);
      listeners.set(channel as string, listenerMap);
      ipcRenderer.on(channel as string, wrapped);
      return () => {
        const map = listeners.get(channel as string);
        if (map) {
          const wrappedListener = map.get(listener);
          if (wrappedListener) {
            ipcRenderer.removeListener(channel as string, wrappedListener);
            map.delete(listener);
          }
        }
      };
    },

    /**
     * Remove listener(s) for a channel
     * @example
     * app.off('ping') // Remove all listeners
     * app.off('ping', listener) // Remove specific listener
     */
    off<K extends keyof IpcSendChannels>(
      channel: K,
      listener?: (
        ...args: ExtractPayload<IpcSendChannels[K]> extends readonly [
          ...infer P,
        ]
          ? P
          : never
      ) => void,
    ) {
      const map = listeners.get(channel as string);
      if (map) {
        if (listener) {
          const wrappedListener = map.get(listener);
          if (wrappedListener) {
            ipcRenderer.removeListener(channel as string, wrappedListener);
            map.delete(listener);
          }
        } else {
          for (const wrappedListener of map.values()) {
            ipcRenderer.removeListener(channel as string, wrappedListener);
          }
          listeners.delete(channel as string);
        }
      }
    },
  };
}

/**
 * Type of the app API created by createAppApi
 */
export type AppApi = ReturnType<typeof createAppApi>;

/**
 * Expose the IPC API to the renderer process
 * This is a convenience function that creates the API and exposes it to the main world
 *
 * @example
 * ```typescript
 * // In preload script:
 * import { exposeIpcApi } from '@timmy-studio/electron-utils/ipc';
 *
 * exposeIpcApi();
 * ```
 */
export function exposeIpcApi() {
  // Dynamic import to avoid importing contextBridge in main process
  const { contextBridge } = require("electron");
  const app = createAppApi();
  contextBridge.exposeInMainWorld("app", app);
}
