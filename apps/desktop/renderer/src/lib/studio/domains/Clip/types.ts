import type { IAnimation } from '../../types/animation';
import type { IEffect } from '../../types/effect';
import type { IShapeData } from '../../types/shape';
import type { ITextData } from '../../types/text';

export type IClip = IGraphicClip | IAudioClip;
export type ClipType =
  | 'video'
  | 'image'
  | 'animated-image'
  | 'shape'
  | 'text'
  | 'audio';
export type IGraphicClip =
  | IVideoClip
  | IImageClip
  | IAnimatedImageClip
  | IShapeClip
  | ITextClip;

export interface IBaseClip {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  trimStart: number;
  trimEnd: number;
  effects: IEffect[];
  animations: IAnimation[];
  enabled: boolean;
}

// Video Track Clips

export interface IGraphicClipBase extends IBaseClip {
  transforms: ITransform;
}

export interface IVideoClip extends IGraphicClipBase {
  type: 'video';
  assetId: string;
}

export interface IImageClip extends IGraphicClipBase {
  type: 'image';
  assetId: string;
}

export interface IAnimatedImageClip extends IGraphicClipBase {
  type: 'animated-image';
  assetId: string;
}

export interface IShapeClip extends IGraphicClipBase {
  type: 'shape';
  shapeData: IShapeData;
}

export interface ITextClip extends IGraphicClipBase {
  type: 'text';
  textData: ITextData;
}

export interface IAudioClip extends IBaseClip {
  type: 'audio';
  assetId: string;
  volume: number; // 0-1
  trackId?: string;
}

export interface ITransform {
  position?: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  scaleX?: number;
  scaleY?: number;
  rotation?: number; // radian
  opacity?: number; // 0-1
  anchorX?: number; // 0-1
  anchorY?: number; // 0-1
}

// Utility Types for Placement Calculation

export type FitMode =
  | 'original'
  | 'stretch'
  | 'contain'
  | 'cover'
  | 'fitWidth'
  | 'fitHeight';
export type AlignX = 'left' | 'center' | 'right';
export type AlignY = 'top' | 'center' | 'bottom';

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface PlacementPreset {
  fit: FitMode;
  alignX: AlignX;
  alignY: AlignY;
}

export interface PlacementResult {
  position: Point;
  size: Size;
}
