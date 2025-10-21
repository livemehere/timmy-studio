import * as path from "node:path";
import { type BrowserWindow, app } from "electron";

/**
 * Get the preload script path
 */
export function getPreloadPath(): string {
  const rootPath = process.cwd();
  return path.join(rootPath, "dist/preload.js");
}

/**
 * Get the renderer URL based on environment
 */
export function getRendererUrl(): string {
  const rendererUrl = process.env["RENDERER_URL"];
  if (rendererUrl) {
    return rendererUrl;
  }

  const rootPath = process.cwd();
  return `file://${path.join(rootPath, "dist/renderer/index.html")}`;
}

/**
 * Load URL in BrowserWindow with proper error handling
 */
export async function loadWindowUrl(
  window: BrowserWindow,
  url?: string,
): Promise<void> {
  const targetUrl = url || getRendererUrl();

  try {
    await window.loadURL(targetUrl);
  } catch (error) {
    console.error("Failed to load URL:", error);
    throw error;
  }
}

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return (
    process.env.NODE_ENV === "development" || !!process.env["RENDERER_URL"]
  );
}

/**
 * Check if app is packaged
 */
export function isPackaged(): boolean {
  return app.isPackaged;
}

/**
 * Get resource path (for production builds)
 */
export function getResourcePath(...paths: string[]): string {
  const rootPath = process.cwd();
  return path.join(rootPath, ...paths);
}

/**
 * Get app data path
 * Returns platform-specific user data directory
 */
export function getAppDataPath(...paths: string[]): string {
  return path.join(app.getPath("userData"), ...paths);
}

/**
 * Get logs path
 */
export function getLogsPath(...paths: string[]): string {
  return path.join(app.getPath("logs"), ...paths);
}

/**
 * Get temp path
 */
export function getTempPath(...paths: string[]): string {
  return path.join(app.getPath("temp"), ...paths);
}

/**
 * Setup window development tools
 * Opens DevTools and enables useful development features
 */
export function setupDevTools(window: BrowserWindow): void {
  if (!isDev()) return;

  window.webContents.openDevTools();

  // Reload on F5
  window.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F5") {
      window.webContents.reload();
      event.preventDefault();
    }
  });

  // DevTools on F12
  window.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12") {
      window.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
}
