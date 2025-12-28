import type { IAnimation } from '../../types/animation';
import type { IEffect } from '../../types/effect';
import type { IShapeData } from '../../types/shape';
import type { ITextData } from '../../types/text';

export type IClip = IGraphicClip | IAudioClip;
export type ClipType = 'video' | 'image' | 'shape' | 'text' | 'audio';
export type IGraphicClip = IVideoClip | IImageClip | IShapeClip | ITextClip;

export interface IBaseClip {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  effects?: IEffect[];
  animations?: IAnimation[];
}

// Video Track Clips

export interface IGraphicClipBase extends IBaseClip {
  transforms: ITransform;
}

export interface IVideoClip extends IGraphicClipBase {
  type: 'video';
  assetId: string;
  trimStart?: number;
  trimEnd?: number;
}

export interface IImageClip extends IGraphicClipBase {
  type: 'image';
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
  trimStart: number;
  trimEnd: number;
  volume: number; // 0-1
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
