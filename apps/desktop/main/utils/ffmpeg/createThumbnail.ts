import { createFfmpeg } from '../ffmpeg';
import { THUMBNAILS_DIR } from '@main/constants/paths';
import path from 'path';

export function createVideoThumbnail(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const filename = path.basename(filePath, path.extname(filePath));
    const thumbnailFilename = `thumbnail.${filename}.jpg`;
    const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFilename);

    createFfmpeg(filePath)
      .on('end', () => {
        resolve(thumbnailPath);
      })
      .on('error', (err) => {
        reject(err);
      })
      .thumbnail({
        count: 1,
        folder: THUMBNAILS_DIR,
        filename: thumbnailFilename,
        size: '320x240',
      });
  });
}
