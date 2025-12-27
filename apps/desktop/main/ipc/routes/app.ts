import { ffmpegPath } from '@main/utils/ffmpeg';
import { createIpcRouter } from '../router';
import type { MainIpcContext } from '../context';

export function createAppRouter() {
  return createIpcRouter<MainIpcContext>().handle(
    'ffmpeg:getPath',
    async () => {
      return ffmpegPath;
    }
  );
}
