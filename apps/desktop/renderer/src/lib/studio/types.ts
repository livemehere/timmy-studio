// ============================================================================
// Project
// ============================================================================

export interface IProject {
  id: string;
  name: string;
  settings: IProjectSettings;
  metadata: IProjectMetadata;
  tracks: ITrack[];
  assets: IAsset[];
}

export interface IProjectSettings {
  width: number;
  height: number;
  frameRate: number;
  sampleRate: number;
  duration: number;
  backgroundColor: string;
}

export interface IProjectMetadata {
  createdAt: string;
  updatedAt: string;
  author?: string;
  description?: string;
}

// ============================================================================
// Timeline
// ============================================================================

// ============================================================================
// Track
// ============================================================================

export interface IBaseTrack {
  id: string;
  name: string;
  enabled: boolean;
  locked: boolean;
  zIndex: number;
}

export interface IVideoTrack extends IBaseTrack {
  type: 'video';
  clips: IVideoClip[];
  opacity: number; // 0-1
}

export interface IAudioTrack extends IBaseTrack {
  type: 'audio';
  clips: IAudioClip[];
  volume: number; // 0-3
}

export type ITrack = IVideoTrack | IAudioTrack;

// ============================================================================
// Clip
// ============================================================================

export interface IBaseClip {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  effects?: IEffect[];
  animations?: IAnimation[];
}

// Video Track Clips

export interface IVideoClipBase extends IBaseClip {
  transforms: ITransform;
}

export interface IVideoMediaClip extends IVideoClipBase {
  type: 'video';
  assetId: string;
  trimStart: number;
  trimEnd: number;
}

export interface IImageClip extends IVideoClipBase {
  type: 'image';
  assetId: string;
}

export interface IShapeClip extends IVideoClipBase {
  type: 'shape';
  shapeData: IShapeData;
}

export interface ITextClip extends IVideoClipBase {
  type: 'text';
  textData: ITextData;
}

export type IVideoClip = IVideoMediaClip | IImageClip | IShapeClip | ITextClip;

// Audio Track Clips

export interface IAudioClip extends IBaseClip {
  type: 'audio';
  assetId: string;
  trimStart: number;
  trimEnd: number;
  volume: number; // 0-1
}

// ============================================================================
// Transform
// ============================================================================

export interface ITransform {
  position: {
    x: number;
    y: number;
  };
  scaleX?: number;
  scaleY?: number;
  rotation?: number; // radian
  opacity?: number; // 0-1
  anchorX?: number; // 0-1
  anchorY?: number; // 0-1
}

// ============================================================================
// Shape Data
// ============================================================================

export interface IShapeData {
  shapeType: 'rectangle' | 'circle' | 'polygon';
  width: number;
  height: number;
  color: number | string;
  radius?: number;
  border?: {
    color: number | string;
    width: number;
  };
}

// ============================================================================
// Text Data
// ============================================================================

export interface ITextData {
  content: string;
  fontSize: number;
  fontFamily: string;
  color: number | string;
  align: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  shadow?: {
    color: number | string;
    offsetX: number;
    offsetY: number;
    blur: number;
  };
  background?: number | string;
  border?: {
    color: number | string;
    width: number;
    radius?: number;
  };
  padding?: number | [number, number] | [number, number, number, number];
}

// ============================================================================
// Asset
// ============================================================================

export interface IBaseAsset {
  id: string;
  name: string;
  filePath: string;
  metadata: IAssetMetadata;
  thumbnail?: string;
}

export interface IVideoAsset extends IBaseAsset {
  type: 'video';
}

export interface IAudioAsset extends IBaseAsset {
  type: 'audio';
}

export interface IImageAsset extends IBaseAsset {
  type: 'image';
}

export type IAsset = IVideoAsset | IAudioAsset | IImageAsset;

export interface IAssetMetadata {
  duration?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  codec?: string;
  size: number;
  createdAt: string;
}

// ============================================================================
// Effect
// ============================================================================

export interface IEffect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, unknown>;
}

export type EffectType =
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'chromaKey'
  | 'mask'
  | 'transition'
  | 'custom';

// ============================================================================
// Animation
// ============================================================================

export interface IAnimation {
  id: string;
  property: string; // 'x', 'y', 'opacity', 'rotation', etc.
  keyframes: IKeyframe[];
}

export interface IKeyframe {
  time: number;
  value: number | string | object;
  easing: EasingFunction;
}

export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier';
