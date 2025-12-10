import { app } from 'electron';
import path from 'node:path';

const APP_DATA_DIR = app.getPath('userData');

export const THUMBNAILS_DIR = path.join(
  APP_DATA_DIR,
  'contents-cache',
  'thumbnails'
);

export const PROXIES_DIR = path.join(APP_DATA_DIR, 'contents-cache', 'proxies');
