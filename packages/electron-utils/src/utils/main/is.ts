import {app} from 'electron';

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function isPackaged(): boolean {
  return app.isPackaged;
}

export function isPreview(): boolean {
  return process.env['ELECTRON_PREVIEW'] === '1';
} 