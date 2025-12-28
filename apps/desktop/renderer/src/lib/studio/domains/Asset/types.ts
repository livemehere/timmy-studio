import type { TrackType } from '@renderer/lib/studio/domains/Track/types';

export interface IAssetMetadata {
  durationMs?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  codec?: string;
  size: number;
  createdAt?: string;
}

export interface IBaseAsset {
  id: string;
  name: string;
  filePath: string;
  metadata: IAssetMetadata;
  thumbnailPath?: string;
}

export interface IVideoAsset extends IBaseAsset {
  type: 'video';
  proxyFilePath?: string;
  isProxyReady?: boolean;
}

export interface IAudioAsset extends IBaseAsset {
  type: 'audio';
}

export interface IImageAsset extends IBaseAsset {
  type: 'image';
}

export interface IAnimatedImageAsset extends IBaseAsset {
  type: 'animated-image';
}

export type AssetType = 'video' | 'audio' | 'image' | 'animated-image';
export type IAsset =
  | IVideoAsset
  | IAudioAsset
  | IImageAsset
  | IAnimatedImageAsset;

// asset ui 에서 사용할 상태
export interface AssetStatus {
  isReady: boolean;
  trackType: TrackType;
}
