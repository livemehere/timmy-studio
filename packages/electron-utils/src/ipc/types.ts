/**
 * Base interface for IPC Invoke Channels (Renderer -> Main, with response)
 * Extend this interface in your app to define custom channels.
 *
 * @example
 * ```typescript
 * // In your app's type definition file:
 * declare module '@timmy-studio/electron-utils/ipc' {
 *   interface IpcInvokeChannels {
 *     add: {
 *       payload: [a: number, b: number];
 *       response: number;
 *     };
 *   }
 * }
 * ```
 */
export interface IpcInvokeChannels {}

/**
 * Base interface for IPC Send Channels (Main -> Renderer, one-way)
 * Extend this interface in your app to define custom channels.
 *
 * @example
 * ```typescript
 * // In your app's type definition file:
 * declare module '@timmy-studio/electron-utils/ipc' {
 *   interface IpcSendChannels {
 *     ping: {
 *       payload: [timestamp: string];
 *     };
 *   }
 * }
 * ```
 */
export interface IpcSendChannels {}

/**
 * Base interface for IPC PostMessage Channels (Renderer -> Main, one-way, supports transferables)
 * Extend this interface in your app to define custom channels.
 */
export interface IpcPostMessageChannels {}
