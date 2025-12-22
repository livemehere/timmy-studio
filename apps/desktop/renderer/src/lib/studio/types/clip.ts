import type { IAnimation } from './animation';
import type { IEffect } from './effect';
import type { IShapeData } from './shape';
import type { ITextData } from './text';
import type { ITransform } from './transform';

export type IClip = IVideoClip | IAudioClip;

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
  trimStart?: number;
  trimEnd?: number;
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
