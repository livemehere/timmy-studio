import type { TrackType } from '@/lib/studio/domains/Track/types';
import type { IShapeData } from '../../types/shape';
import type { ITextData } from '../../types/text';

export interface IBaseAssetMetadata {
  size: number;
  createdAt?: string;
}

export interface IMediaAssetMetadata extends IBaseAssetMetadata {
  durationMs?: number;
  width: number;
  height: number;
  frameRate?: number;
  codec?: string;
}

export interface IBaseAsset {
  id: string;
  name: string;
}

export interface IMediaAsset extends IBaseAsset {
  filePath: string;
  metadata: IMediaAssetMetadata;
  thumbnailPath?: string;
  isLoadError?: boolean;
}

export interface IVideoAsset extends IMediaAsset {
  type: 'video';
  proxyFilePath?: string;
  isProxyReady?: boolean;
}

export interface IAudioAsset extends IMediaAsset {
  type: 'audio';
}

export interface IImageAsset extends IMediaAsset {
  type: 'image';
}

export interface IAnimatedImageAsset extends IMediaAsset {
  type: 'animated-image';
}

export interface IShapeAsset extends IBaseAsset {
  type: 'shape';
  shapeData: IShapeData;
  metadata: IBaseAssetMetadata;
}

export interface ITextAsset extends IBaseAsset {
  type: 'text';
  textData: ITextData;
  metadata: IBaseAssetMetadata;
}

export type AssetType =
  | 'video'
  | 'audio'
  | 'image'
  | 'animated-image'
  | 'shape'
  | 'text';
export type IAsset =
  | IVideoAsset
  | IAudioAsset
  | IImageAsset
  | IAnimatedImageAsset
  | IShapeAsset
  | ITextAsset;

// asset ui 에서 사용할 상태
export interface AssetStatus {
  trackType: TrackType;
  isReady: boolean;
  isError: boolean;
}
