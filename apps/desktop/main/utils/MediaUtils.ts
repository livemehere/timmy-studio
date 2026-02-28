import path from 'node:path';
import { app } from 'electron';
import FfmpegCmd, { type FfprobeData, type FfprobeStream } from 'fluent-ffmpeg';
import { FileUtils } from '@main/utils/FileUtils';
import type {
  AssetType,
  IAsset,
  IMediaAssetMetadata,
  IMediaAsset,
} from '@/lib/studio/domains/Asset/types';
import { uid } from 'uid';
import fs from 'node:fs';
import { getExtraResourcePath } from '@timmy-studio/electron-utils/utils/main';

const FFMPEG_PATH = getExtraResourcePath('ffmpeg');
const FFPROBE_PATH = getExtraResourcePath('ffprobe');

FileUtils.ensureExecutable(FFMPEG_PATH);
FileUtils.ensureExecutable(FFPROBE_PATH);

FfmpegCmd.setFfmpegPath(FFMPEG_PATH);
FfmpegCmd.setFfprobePath(FFPROBE_PATH);

const APP_DATA_DIR = app.getPath('userData');

export class MediaUtils {
  static readonly ffmpegPath = FFMPEG_PATH;
  static readonly ffprobePath = FFPROBE_PATH;
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

  /** 프록시 비디오 생성 (macOS 최적화) */
  static createProxyVideo(originFilePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proxyPath = MediaUtils.getProxyFilePath(originFilePath);

      // 이미 있으면 바로 리턴(경합 방지)
      if (fs.existsSync(proxyPath)) {
        resolve(proxyPath);
        return;
      }

      // 디렉토리 보장
      fs.mkdirSync(MediaUtils.PROXIES_DIR, { recursive: true });

      // 프록시 타깃 파라미터
      const TARGET_HEIGHT = 360;
      // const TARGET_FPS = 30; // 60fps 원본도 프록시는 30으로 고정(체감 성능↑)
      // const GOP = TARGET_FPS; // 1초 GOP (스크러빙/탐색 유리)
      const BITRATE = '800k';
      const BUFSIZE = '1600k';

      // ⚠️ null spread 같은 실수를 원천 차단
      const inputOpts: string[] = [
        // macOS HW decode 시도 (ffmpeg 4.4에서는 "output_format videotoolbox" 쓰면 안 됨)
        '-hwaccel',
        'videotoolbox',

        // iPhone rotate 메타를 프록시 단계에서 처리하지 말기 (CPU 필터 체인 폭발 방지)
        '-noautorotate',
      ];

      const outputOpts: string[] = [
        // 불필요한 스트림 제거 (특히 mov의 data stream들)
        '-map',
        '0:v:0',

        // VideoToolbox HW encode
        '-c:v',
        'h264_videotoolbox',

        // rate control (고정 비트레이트 느낌으로)
        '-b:v',
        BITRATE,
        '-maxrate',
        BITRATE,
        '-bufsize',
        BUFSIZE,

        // 스케일만 (최소 필터)
        '-vf',
        `scale=-2:${TARGET_HEIGHT}`,

        // 프록시는 4:2:0로 통일(호환성/디코드 안정)
        '-pix_fmt',
        'yuv420p',

        // 프록시 fps 고정 (원본이 59.94여도 30으로 내림)
        // '-r',
        // String(TARGET_FPS),

        // // 스크러빙/탐색 최적
        // '-g',
        // String(GOP),
        '-bf',
        '0',
        '-flags',
        '+cgop',

        // 프록시는 faststart 불필요 (2nd pass 제거)
        // '-movflags', '+faststart',
      ];

      MediaUtils.ffmpeg(originFilePath)
        .on('start', (cmd) => console.log('[ffmpeg]', cmd))
        .on('stderr', (line) => console.log('[ffmpeg stderr]', line))
        .on('end', () => resolve(proxyPath))
        .on('error', (err) => reject(err))
        .inputOptions(inputOpts)
        .outputOptions(outputOpts)
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

    console.log(`[MediaUtils] detectAssetType for ${data.format.filename}:`, {
      formatName,
      duration: durationNum,
      hasRealDuration,
      hasPrimaryVideo: !!primaryVideo,
      hasAudio: !!audioStream,
      videoCodec: primaryVideo?.codec_name,
      nbFrames: primaryVideo?.nb_frames,
    });

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

    console.log(`[MediaUtils] Video stream analysis:`, {
      codec,
      isImageCodec,
      nbFrames,
      isSingleFrame,
    });

    // 3-1) 이미지 코덱 + duration 없음/짧음 + 프레임 1장 => 정지 이미지
    if (isImageCodec && !hasRealDuration && isSingleFrame) {
      console.log(`[MediaUtils] → Detected as IMAGE`);
      return 'image';
    }

    // 3-2) GIF/APNG/WEBP 계열 + 여러 프레임 => animated-image
    const looksAnimatedContainer = MediaUtils.ANIMATED_FORMAT_HINTS.some((h) =>
      formatName.includes(h)
    );

    if (looksAnimatedContainer && !isSingleFrame) {
      console.log(`[MediaUtils] → Detected as ANIMATED-IMAGE`);
      return 'animated-image';
    }

    // 3-3) 나머지는 비디오
    console.log(`[MediaUtils] → Detected as VIDEO`);
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
  static createAssetMetadata(data: FfprobeData): IMediaAssetMetadata {
    const assetType = MediaUtils.detectAssetType(data);

    const videoStream = MediaUtils.extractPrimaryVideoStream(data);
    const audioStream = MediaUtils.extractAudioStream(data);

    const durationSec = Number(data.format.duration);
    let durationMs: number | undefined =
      Number.isFinite(durationSec) && durationSec > 0
        ? Math.round(durationSec * 1000)
        : undefined;

    // 정지 이미지는 duration이 없어야 함
    if (assetType === 'image') {
      console.log(
        `[MediaUtils] Image detected, clearing duration (was: ${durationMs}ms from ffprobe)`
      );
      durationMs = undefined;
    }

    const metadata: IMediaAssetMetadata = {
      size: data.format.size ?? 0,
      durationMs: durationMs ?? 0,
      createdAt: MediaUtils.getCreatedTime(data),
      width: 0,
      height: 0,
      hasAudio: !!audioStream,
    };

    // video / image / animated-image 공통 (video stream 기준)
    if (videoStream) {
      metadata.width = videoStream.width ?? 0;
      metadata.height = videoStream.height ?? 0;
      metadata.codec = videoStream.codec_name;

      if (!MediaUtils.isUnreliableFps(videoStream)) {
        metadata.frameRate = MediaUtils.parseFps(videoStream.r_frame_rate);
      }
    }

    // audio only
    if (assetType === 'audio' && audioStream) {
      metadata.codec = audioStream.codec_name;
    }

    console.log(`[MediaUtils] Asset metadata created:`, {
      type: assetType,
      durationMs: metadata.durationMs,
      width: metadata.width,
      height: metadata.height,
      codec: metadata.codec,
    });

    return metadata;
  }

  /** 에셋 생성 */
  static async createAsset(filePath: string): Promise<IAsset> {
    try {
      const ffprobeData = await MediaUtils.ffprobe(filePath);
      const metadata = MediaUtils.createAssetMetadata(ffprobeData);
      const assetType = MediaUtils.detectAssetType(ffprobeData);

      const baseAsset: IMediaAsset = {
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
    } catch (e) {
      console.error(`[MediaUtils] 에셋 생성 실패 (${filePath}):`, e);
      // 에러 발생 시 isLoadError 플래그와 함께 최소한의 정보 반환
      return {
        id: uid(8),
        name: path.basename(filePath),
        filePath,
        metadata: { size: 0 },
        type: 'video', // 기본값
        isLoadError: true,
      } as IAsset;
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

  /**
   * 모든 캐시 디렉토리(thumbnails, proxies, filmstrips)를 비우고 재생성한다.
   * @returns 삭제된 파일 수
   */
  static async cleanupAllCache(): Promise<number> {
    const dirs = [
      MediaUtils.THUMBNAILS_DIR,
      MediaUtils.PROXIES_DIR,
      MediaUtils.FILMSTRIPS_DIR,
    ];
    let deletedCount = 0;
    for (const dir of dirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        deletedCount += files.length;
        fs.rmSync(dir, { recursive: true, force: true });
      }
      fs.mkdirSync(dir, { recursive: true });
    }
    return deletedCount;
  }
}
