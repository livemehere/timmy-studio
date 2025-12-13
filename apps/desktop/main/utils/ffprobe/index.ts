import type { FfprobeData } from 'fluent-ffmpeg';
import type {
  IAsset,
  IVideoAsset,
  IAudioAsset,
  IImageAsset,
} from '@renderer/lib/studio/types/asset';
import { randomUUID } from 'crypto';
import path from 'path';
import {
  createAudioAssetMetadata,
  createVideoAssetMetadata,
} from '@main/utils/ffprobe/createAssetMetadata';
import {
  getAudioStream,
  getPrimaryVideoStream,
} from '@main/utils/ffprobe/getStream';
import { detectAssetType } from '@main/utils/ffprobe/detectAssetType';
import { getCreatedAt } from './getCreatedAt';
import { createVideoThumbnail } from '@main/utils/ffmpeg/createThumbnail';
import { createProxy } from '../ffmpeg/createProxy';

function createVideoAsset(
  data: FfprobeData,
  createdAt: string | undefined,
  thumbnailPath: string,
  proxyPath?: string
): IVideoAsset {
  const filePath = data.format.filename!;
  const videoStream = getPrimaryVideoStream(data);

  return {
    id: randomUUID(),
    name: path.basename(filePath),
    filePath,
    type: 'video',
    thumbnailPath,
    proxyFilePath: proxyPath,
    metadata: {
      ...createVideoAssetMetadata(data, videoStream),
      createdAt,
    },
  };
}

function createAudioAsset(data: FfprobeData, createdAt?: string): IAudioAsset {
  const filePath = data.format.filename!;
  const audioStream = getAudioStream(data);

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
  const videoStream = getPrimaryVideoStream(data);

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
export async function createAssetData(meta: FfprobeData): Promise<IAsset> {
  if (!meta.format.filename) {
    throw new Error('File path is missing in ffprobe data');
  }

  const assetType = detectAssetType(meta);
  const createdAt = getCreatedAt(meta);

  switch (assetType) {
    case 'video':
      const thumbnailPath = await createVideoThumbnail(meta.format.filename);
      const proxyPath = await createProxy(meta.format.filename);
      return createVideoAsset(meta, createdAt, thumbnailPath, proxyPath);
    case 'audio':
      return createAudioAsset(meta, createdAt);
    case 'image':
      return createImageAsset(meta, createdAt);
    case 'animated-image':
      const thumbPath = await createVideoThumbnail(meta.format.filename);
      // 정책 1) animated-image를 별도 타입으로 쓰고 싶으면:
      // return { ...createImageAsset(data), type: 'image', isAnimated: true } 처럼 확장
      // 정책 2) 지금 당장은 비디오로 취급하고 싶으면:
      return createVideoAsset(meta, createdAt, thumbPath);
  }
}
