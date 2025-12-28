import path from 'node:path';
import { app } from 'electron';
import FfmpegCmd, { type FfprobeData } from 'fluent-ffmpeg';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';
import { FileUtils } from '@main/utils/FileUtils';

FileUtils.ensureExecutable(ffmpeg.path);
FileUtils.ensureExecutable(ffprobe.path);

FfmpegCmd.setFfmpegPath(ffmpeg.path);
FfmpegCmd.setFfprobePath(ffprobe.path);

const APP_DATA_DIR = app.getPath('userData');

export class MediaUtils {
  static readonly THUMBNAILS_DIR = path.join(
    APP_DATA_DIR,
    'contents-cache',
    'thumbnails'
  );
  static readonly PROXIES_DIR = path.join(
    APP_DATA_DIR,
    'contents-cache',
    'proxies'
  );
  static readonly FILMSTRIPS_DIR = path.join(
    APP_DATA_DIR,
    'contents-cache',
    'filmstrips'
  );

  static ffmpegPath = ffmpeg.path;
  static ffprobePath = ffprobe.path;
  static ffmpeg = FfmpegCmd;
  static ffprobe = (filePath: string) => {
    return new Promise<FfprobeData>((resolve, reject) => {
      FfmpegCmd.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  };

  /** 생성 시간 추출 ( ffprobe의 meta 데이터 > file-system 의 stat 데이터 > undefined ) */
  static getCreatedTime(data: FfprobeData) {
    const creationTime = data.format.tags?.creation_time as string | undefined;
    return creationTime ?? FileUtils.getCreatedTime(data.format.filename!);
  }

  /** 비디오 스트림 추출 (커버아트/썸네일 제외) */
  static extractPrimaryVideoStream(data: FfprobeData) {
    return data.streams.find(
      (s) =>
        s.codec_type === 'video' &&
        // attached_pic(커버아트/썸네일) 제외
        s.disposition?.attached_pic !== 1
    );
  }

  /** 오디오 스트림 추출 */
  static extractAudioStream(data: FfprobeData) {
    return data.streams.find((s) => s.codec_type === 'audio');
  }

  /** 프록시 파일 경로 생성 */
  static getProxyFilePath(originFilePath: string): string {
    const filename = path.basename(
      originFilePath,
      path.extname(originFilePath)
    );
    const proxyFilename = `proxy.${filename}.mp4`;
    return path.join(MediaUtils.PROXIES_DIR, proxyFilename);
  }

  /** 프록시 비디오 생성 */
  static createProxyVideo(originFilePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proxyPath = MediaUtils.getProxyFilePath(originFilePath);

      MediaUtils.ffmpeg(originFilePath)
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

  /** 썸네일 이미지 생성 */
  static createThumbnailImage(originFilePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const filename = path.basename(
        originFilePath,
        path.extname(originFilePath)
      );
      const thumbnailFilename = `thumbnail.${filename}.jpg`;
      const thumbnailPath = path.join(
        MediaUtils.THUMBNAILS_DIR,
        thumbnailFilename
      );

      MediaUtils.ffmpeg(originFilePath)
        .on('end', () => {
          resolve(thumbnailPath);
        })
        .on('error', (err) => {
          reject(err);
        })
        .thumbnail({
          count: 1,
          folder: MediaUtils.THUMBNAILS_DIR,
          filename: thumbnailFilename,
          size: '320x240',
        });
    });
  }
}
