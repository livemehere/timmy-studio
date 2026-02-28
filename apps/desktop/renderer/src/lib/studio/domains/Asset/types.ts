import type { TrackType } from '@/lib/studio/domains/Track/types';
import type { IShapeData } from '../../types/shape';
import type { ITextData } from '../../types/text';

export interface IBaseAssetMetadata {
  size: number;
  createdAt?: string;
}

export interface IMediaAssetMetadata extends IBaseAssetMetadata {
  durationMs: number;
  width: number;
  height: number;
  frameRate?: number;
  codec?: string;
  /** 오디오 스트림 존재 여부 (ffprobe 검출) */
  hasAudio?: boolean;
  /** GPS 좌표 문자열 (ISO 6709 등, ffprobe tags 에서 추출) */
  location?: string;
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

/** 필름스트립 프레임 추출 결과 메타데이터 */
export interface IFilmstripData {
  /** 프레임 이미지들이 저장된 디렉토리 경로 */
  dir: string;
  /** 추출된 총 프레임 수 */
  frameCount: number;
  /** 프레임 간 시간 간격 (ms) */
  intervalMs: number;
  /** 프레임 이미지 너비 (px) */
  frameWidth: number;
  /** 프레임 이미지 높이 (px) */
  frameHeight: number;
}

export interface IVideoAsset extends IMediaAsset {
  type: 'video';
  proxyFilePath?: string;
  isProxyReady?: boolean;
  filmstripData?: IFilmstripData;
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
