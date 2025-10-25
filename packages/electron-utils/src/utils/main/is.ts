import {app} from 'electron';

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return app.isPackaged === false;
}