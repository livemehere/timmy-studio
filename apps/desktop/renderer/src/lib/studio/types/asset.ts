export interface IAssetMetadata {
  duration?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  codec?: string;
  size: number;
  createdAt: string;
}

export interface IBaseAsset {
  id: string;
  name: string;
  filePath: string;
  metadata: IAssetMetadata;
  thumbnail?: string;
}

export interface IVideoAsset extends IBaseAsset {
  type: 'video';
  proxyFilePath?: string;
}

export interface IAudioAsset extends IBaseAsset {
  type: 'audio';
}

export interface IImageAsset extends IBaseAsset {
  type: 'image';
}

export type IAsset = IVideoAsset | IAudioAsset | IImageAsset;
