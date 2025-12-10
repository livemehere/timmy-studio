import path from 'path';
import { createFfmpeg } from '../ffmpeg';
import { PROXIES_DIR } from '@main/constants/paths';

export function createProxy(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const filename = path.basename(filePath, path.extname(filePath));
    const proxyFilename = `proxy.${filename}.mp4`;
    const proxyPath = path.join(PROXIES_DIR, proxyFilename);

    createFfmpeg(filePath)
      .on('end', () => resolve(proxyPath))
      .on('error', reject)
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        '-crf 28',
        '-movflags +faststart',
      ])
      .noAudio()
      .save(proxyPath);
  });
}
