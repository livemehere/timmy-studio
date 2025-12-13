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
  /**
   * `false` while proxy generation is in progress.
   * `true` once main process confirms proxy file exists.
   * `undefined` for legacy assets created before this flag existed.
   */
  isProxyReady?: boolean;
}

export interface IAudioAsset extends IBaseAsset {
  type: 'audio';
}

export interface IImageAsset extends IBaseAsset {
  type: 'image';
}
export type AssetType = 'video' | 'audio' | 'image' | 'animated-image';
export type IAsset = IVideoAsset | IAudioAsset | IImageAsset;

export type AssetGetter = <T extends IAsset = IAsset>(
  assetId: string
) => T | undefined;
