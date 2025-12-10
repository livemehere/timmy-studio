import fs from 'fs';
import { THUMBNAILS_DIR } from '@main/constants/paths';

export function ensureFiles() {
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  }
}
