import path from 'path';
import { createFfmpeg } from '../ffmpeg';
import { PROXIES_DIR } from '@main/constants/paths';

export function getProxyPath(filePath: string) {
  const filename = path.basename(filePath, path.extname(filePath));
  const proxyFilename = `proxy.${filename}.mp4`;
  return path.join(PROXIES_DIR, proxyFilename);
}

export function createProxy(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proxyPath = getProxyPath(filePath);

    createFfmpeg(filePath)
      .on('end', () => resolve(proxyPath))
      .on('error', reject)
      // 기존(내가한거)
      // .outputOptions([
      //   '-c:v libx264',
      //   '-preset veryfast',
      //   '-crf 40',
      //   '-movflags +faststart',
      // ])
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        '-crf 28', // 40은 너무 낮은 품질이라 디테일 깨짐/블록이 심할 수 있음(탐색 자체엔 영향 적지만 실사용에 영향)
        '-pix_fmt yuv420p',
        '-movflags +faststart',

        '-vf scale=-2:540', // 프록시 핵심(원하는 해상도로 조절)
        '-r 30', // 필요 시

        '-g 30', // 30fps 기준 1초 GOP
        '-keyint_min 30',
        '-sc_threshold 0',
        '-bf 0', // 디코드 단순화(스크러빙 유리)
      ])
      .noAudio()
      .save(proxyPath);
  });
}
