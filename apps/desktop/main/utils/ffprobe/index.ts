import type { FfprobeData } from 'fluent-ffmpeg';
import type {
  IAsset,
  IVideoAsset,
  IAudioAsset,
  IImageAsset,
} from '@renderer/lib/studio/types/asset';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import {
  createAudioAssetMetadata,
  createVideoAssetMetadata,
} from '@main/utils/ffprobe/createAssetMetadata';

import { MediaUtils } from '@main/utils/MediaUtils';

function createVideoAsset(
  data: FfprobeData,
  createdAt: string | undefined,
  thumbnailPath: string,
  proxyPath?: string,
  isProxyReady?: boolean
): IVideoAsset {
  const filePath = data.format.filename!;
  const videoStream = MediaUtils.extractPrimaryVideoStream(data);

  const metadata = {
    ...createVideoAssetMetadata(data, videoStream),
    createdAt,
  };
  return {
    id: randomUUID(),
    name: path.basename(filePath),
    filePath,
    type: 'video',
    thumbnailPath,
    proxyFilePath: proxyPath,
    isProxyReady,
    metadata,
  };
}

function createAudioAsset(data: FfprobeData, createdAt?: string): IAudioAsset {
  const filePath = data.format.filename!;
  const audioStream = MediaUtils.extractAudioStream(data);

  return {
    id: randomUUID(),
    name: path.basename(filePath),
    filePath,
    type: 'audio',
    metadata: {
      ...createAudioAssetMetadata(data, audioStream),
      createdAt,
    },
  };
}

function createImageAsset(data: FfprobeData, createdAt?: string): IImageAsset {
  const filePath = data.format.filename!;
  const videoStream = MediaUtils.extractPrimaryVideoStream(data);

  return {
    id: randomUUID(),
    name: path.basename(filePath),
    filePath,
    type: 'image',
    metadata: {
      ...createVideoAssetMetadata(data, videoStream),
      createdAt,
    },
  };
}

/**
 * animated-image를 video로 취급하려면
 * 여기서 animated-image 케이스를 video로 매핑하면 됨.
 */
export async function createAssetData(
  meta: FfprobeData,
  options?: {
    createProxy?: boolean;
  }
): Promise<IAsset> {
  if (!meta.format.filename) {
    throw new Error('File path is missing in ffprobe data');
  }

  const assetType = MediaUtils.detectAssetType(meta);
  const createdAt = MediaUtils.getCreatedTime(meta);
  const shouldCreateProxy = options?.createProxy ?? true;

  switch (assetType) {
    case 'video': {
      const thumbnailPath = await MediaUtils.createThumbnailImage(
        meta.format.filename
      );
      if (shouldCreateProxy) {
        const proxyPath = await MediaUtils.createProxyVideo(
          meta.format.filename
        );
        return createVideoAsset(
          meta,
          createdAt,
          thumbnailPath,
          proxyPath,
          true
        );
      }

      const proxyPath = MediaUtils.getProxyFilePath(meta.format.filename);
      const isProxyReady = fs.existsSync(proxyPath);
      return createVideoAsset(
        meta,
        createdAt,
        thumbnailPath,
        proxyPath,
        isProxyReady
      );
    }
    case 'audio':
      return createAudioAsset(meta, createdAt);
    case 'image':
      return createImageAsset(meta, createdAt);
    case 'animated-image': {
      const thumbPath = await MediaUtils.createThumbnailImage(
        meta.format.filename
      );
      // 정책 1) animated-image를 별도 타입으로 쓰고 싶으면:
      // return { ...createImageAsset(data), type: 'image', isAnimated: true } 처럼 확장
      // 정책 2) 지금 당장은 비디오로 취급하고 싶으면:
      if (shouldCreateProxy) {
        const proxyPath = await MediaUtils.createProxyVideo(
          meta.format.filename
        );
        return createVideoAsset(meta, createdAt, thumbPath, proxyPath, true);
      }

      const proxyPath = MediaUtils.getProxyFilePath(meta.format.filename);
      const isProxyReady = fs.existsSync(proxyPath);
      return createVideoAsset(
        meta,
        createdAt,
        thumbPath,
        proxyPath,
        isProxyReady
      );
    }
  }
}
