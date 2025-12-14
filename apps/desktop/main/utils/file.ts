import fs from 'fs';
import {
  THUMBNAILS_DIR,
  PROXIES_DIR,
  FILMSTRIPS_DIR,
} from '@main/constants/paths';

export function ensureFiles() {
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROXIES_DIR)) {
    fs.mkdirSync(PROXIES_DIR, { recursive: true });
  }
  if (!fs.existsSync(FILMSTRIPS_DIR)) {
    fs.mkdirSync(FILMSTRIPS_DIR, { recursive: true });
  }
}
