import FfmpegCmd, { type FfprobeData } from 'fluent-ffmpeg';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';
import { ensureExecutable } from '@main/utils/ensureExecutable';

ensureExecutable(ffmpeg.path);
ensureExecutable(ffprobe.path);

FfmpegCmd.setFfmpegPath(ffmpeg.path);
FfmpegCmd.setFfprobePath(ffprobe.path);

export const ffmpegPath = ffmpeg.path;
export const ffprobePath = ffprobe.path;

export function ffprobePromise(filePath: string): Promise<FfprobeData> {
  return new Promise<any>((resolve, reject) => {
    FfmpegCmd.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
}

export function createFfmpeg(...args: Parameters<typeof FfmpegCmd>) {
  return FfmpegCmd(...args);
}
