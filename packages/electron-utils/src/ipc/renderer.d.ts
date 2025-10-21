/**
 * Triple-slash reference file for extending Window interface with app API
 *
 * Add this to your app's type definition file:
 * /// <reference types="@timmy-studio/electron-utils/ipc/renderer" />
 */

import type { AppApi } from "./preload";

declare global {
  interface Window {
    app: AppApi;
  }
}

export {};
