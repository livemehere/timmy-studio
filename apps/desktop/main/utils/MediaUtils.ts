import path from 'node:path';
import { app } from 'electron';
import FfmpegCmd, { type FfprobeData, type FfprobeStream } from 'fluent-ffmpeg';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';
import { FileUtils } from '@main/utils/FileUtils';
import type {
  AssetType,
  IAsset,
  IAssetMetadata,
  IBaseAsset,
} from '@renderer/lib/studio/domains/Asset/types';
import { uid } from 'uid';
import fs from 'node:fs';

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

  /** "이미지로 보이는 비디오 스트림"을 구분하기 위한 힌트들 */
  static IMAGE_CODEC_NAMES = [
    'png',
    'mjpeg',
    'jpeg',
    'jpg',
    'webp',
    'bmp',
    'tiff',
    'gif',
  ];

  /** 애니메이션 이미지 포맷 힌트 */
  static ANIMATED_FORMAT_HINTS = ['gif', 'apng', 'webp'];

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

  /** AssetType 판별 */
  static detectAssetType(data: FfprobeData): AssetType {
    const primaryVideo = MediaUtils.extractPrimaryVideoStream(data);
    const audioStream = MediaUtils.extractAudioStream(data);

    const formatName = (data.format.format_name ?? '').toLowerCase();

    const durationNum = Number(data.format.duration ?? 0);
    const hasRealDuration = Number.isFinite(durationNum) && durationNum > 0.1;

    // 1) 비디오 스트림이 없고 오디오만 있으면 audio
    if (!primaryVideo && audioStream) return 'audio';

    // 2) 비디오 스트림이 없으면 image
    if (!primaryVideo) return 'image';

    // 3) primaryVideo가 있으면 video vs image 계열 판별
    const codec = (primaryVideo.codec_name ?? '').toLowerCase();

    const nbFrames =
      primaryVideo.nb_frames != null
        ? Number(primaryVideo.nb_frames)
        : undefined;

    const isImageCodec = MediaUtils.IMAGE_CODEC_NAMES.includes(codec);
    const isSingleFrame =
      nbFrames === undefined || !Number.isFinite(nbFrames) || nbFrames <= 1;

    // 3-1) 이미지 코덱 + duration 없음/짧음 + 프레임 1장 => 정지 이미지
    if (isImageCodec && !hasRealDuration && isSingleFrame) {
      return 'image';
    }

    // 3-2) GIF/APNG/WEBP 계열 + 여러 프레임 => animated-image
    const looksAnimatedContainer = MediaUtils.ANIMATED_FORMAT_HINTS.some((h) =>
      formatName.includes(h)
    );

    if (looksAnimatedContainer && !isSingleFrame) {
      return 'animated-image';
    }

    // 3-3) 나머지는 비디오
    return 'video';
  }

  /** r_frame_rate 또는 avg_frame_rate 문자열 파싱 */
  private static parseFps(rFrameRate?: string): number | undefined {
    if (!rFrameRate) return undefined;
    const [n, d] = rFrameRate.split('/').map(Number);
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return undefined;
    const fps = n / d;
    return Number.isFinite(fps) && fps > 0 ? fps : undefined;
  }

  /** 신뢰할 수 없는 프레임레이트인지 검사 */
  private static isUnreliableFps(stream: FfprobeStream): boolean {
    const avg = MediaUtils.parseFps(stream?.avg_frame_rate);
    const r = MediaUtils.parseFps(stream?.r_frame_rate);

    if (!avg) {
      if (r && r > 240) return true;
      if (!r) return true;
    }

    if (avg && avg > 120) return true;

    return false;
  }

  /** 에셋 메타데이터 생성 */
  static createAssetMetadata(data: FfprobeData): IAssetMetadata {
    const assetType = MediaUtils.detectAssetType(data);

    const videoStream = MediaUtils.extractPrimaryVideoStream(data);
    const audioStream = MediaUtils.extractAudioStream(data);

    const durationSec = Number(data.format.duration);
    const durationMs =
      Number.isFinite(durationSec) && durationSec > 0
        ? Math.round(durationSec * 1000)
        : undefined;

    const metadata: IAssetMetadata = {
      size: data.format.size ?? 0,
      durationMs,
      createdAt: MediaUtils.getCreatedTime(data),
    };

    // video / image / animated-image 공통 (video stream 기준)
    if (videoStream) {
      metadata.width = videoStream.width;
      metadata.height = videoStream.height;
      metadata.codec = videoStream.codec_name;

      if (!MediaUtils.isUnreliableFps(videoStream)) {
        metadata.frameRate = MediaUtils.parseFps(videoStream.r_frame_rate);
      }
    }

    // audio only
    if (assetType === 'audio' && audioStream) {
      metadata.codec = audioStream.codec_name;
    }

    return metadata;
  }

  /** 에셋 생성 */
  static async createAsset(filePath: string): Promise<IAsset> {
    const ffprobeData = await MediaUtils.ffprobe(filePath);
    const metadata = MediaUtils.createAssetMetadata(ffprobeData);
    const assetType = MediaUtils.detectAssetType(ffprobeData);

    const baseAsset: IBaseAsset = {
      id: uid(8),
      name: path.basename(filePath),
      filePath,
      metadata,
    };

    switch (assetType) {
      case 'video':
        const proxyFilePath = MediaUtils.getProxyFilePath(filePath);
        const proxyAlreadyExists = fs.existsSync(proxyFilePath); // 이미 있으면 생성 안함
        return {
          ...baseAsset,
          type: 'video',
          thumbnailPath: await MediaUtils.createThumbnailImage(filePath),
          proxyFilePath,
          isProxyReady: proxyAlreadyExists,
        };
      case 'audio':
        return {
          ...baseAsset,
          type: 'audio',
          thumbnailPath: undefined,
        };
      case 'image':
        return {
          ...baseAsset,
          type: 'image',
          thumbnailPath: filePath, // 파일 자체를 썸네일로 사용
        };
      case 'animated-image':
        return {
          ...baseAsset,
          type: 'animated-image',
          thumbnailPath: filePath, // 파일 자체를 썸네일로 사용
        };
      default:
        throw new Error(`Unsupported asset type: ${assetType}`);
    }
  }

  /** 에셋 생성 후속 처리 */
  static async postProcessAssetCreation(
    asset: IAsset
  ): Promise<IAsset | undefined> {
    if (asset.type === 'video' && !asset.isProxyReady) {
      return {
        ...asset,
        isProxyReady: true,
        proxyFilePath: await MediaUtils.createProxyVideo(asset.filePath),
      };
    }
    return undefined;
  }
}
