import type {
  IVideoMediaClip,
  IImageClip,
  IAudioClip,
  IShapeClip,
  ITextClip,
  ITransform,
  IShapeData,
  ITextData,
} from '@renderer/lib/studio/types/types';
import { uid } from 'uid';

export interface CreateClipOptions {
  name: string;
  startTime: number;
  endTime: number;
}

export interface CreateVideoClipOptions extends CreateClipOptions {
  type: 'video';
  assetId: string;
  width?: number;
  height?: number;
  trimStart?: number;
  trimEnd?: number;
  transforms?: Partial<ITransform>;
}

export interface CreateImageClipOptions extends CreateClipOptions {
  type: 'image';
  assetId: string;
  width?: number;
  height?: number;
  transforms?: Partial<ITransform>;
}

export interface CreateAudioClipOptions extends CreateClipOptions {
  type: 'audio';
  assetId: string;
  trimStart?: number;
  trimEnd?: number;
  volume?: number;
}

export interface CreateShapeClipOptions extends CreateClipOptions {
  type: 'shape';
  shapeData: IShapeData;
  transforms?: Partial<ITransform>;
}

export interface CreateTextClipOptions extends CreateClipOptions {
  type: 'text';
  textData: ITextData;
  transforms?: Partial<ITransform>;
}

export type CreateClipOptionsUnion =
  | CreateVideoClipOptions
  | CreateImageClipOptions
  | CreateAudioClipOptions
  | CreateShapeClipOptions
  | CreateTextClipOptions;

export function mergeTransforms(
  base: ITransform,
  override?: Partial<ITransform>
): ITransform {
  if (!override) return base;

  return {
    ...base,
    ...override,
    position: override.position
      ? { ...(base.position ?? { x: 0, y: 0 }), ...override.position }
      : base.position,
    size: override.size
      ? {
          ...(base.size ?? { width: 0, height: 0 }),
          ...override.size,
        }
      : base.size,
  };
}

/**
 * 팩토리 함수: 타입에 따라 적절한 클립 생성
 */
export function createClip(options: CreateVideoClipOptions): IVideoMediaClip;
export function createClip(options: CreateImageClipOptions): IImageClip;
export function createClip(options: CreateAudioClipOptions): IAudioClip;
export function createClip(options: CreateShapeClipOptions): IShapeClip;
export function createClip(options: CreateTextClipOptions): ITextClip;
export function createClip(
  options: CreateClipOptionsUnion
): IVideoMediaClip | IImageClip | IAudioClip | IShapeClip | ITextClip {
  switch (options.type) {
    case 'video':
      return createVideoClip(options);
    case 'image':
      return createImageClip(options);
    case 'audio':
      return createAudioClip(options);
    case 'shape':
      return createShapeClip(options);
    case 'text':
      return createTextClip(options);
  }
}

/**
 * Video 클립 생성
 */
export function createVideoClip(
  options: CreateVideoClipOptions
): IVideoMediaClip {
  const {
    name,
    assetId,
    startTime,
    endTime,
    width = 1280,
    height = 720,
    trimStart = 0,
    trimEnd,
    transforms: transformsOverride,
  } = options;
  const duration = endTime - startTime;

  const baseTransforms: ITransform = {
    position: { x: 0, y: 0 },
    size: { width, height },
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    anchorX: 0,
    anchorY: 0,
  };

  return {
    id: `clip-${uid(8)}`,
    name,
    type: 'video',
    assetId,
    startTime,
    endTime,
    trimStart,
    trimEnd: trimEnd ?? duration,
    transforms: mergeTransforms(baseTransforms, transformsOverride),
  };
}

/**
 * Image 클립 생성
 */
export function createImageClip(options: CreateImageClipOptions): IImageClip {
  const {
    name,
    assetId,
    startTime,
    endTime,
    width = 1280,
    height = 720,
    transforms: transformsOverride,
  } = options;

  const baseTransforms: ITransform = {
    position: { x: 0, y: 0 },
    size: { width, height },
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    anchorX: 0,
    anchorY: 0,
  };

  return {
    id: `clip-${uid(8)}`,
    name,
    type: 'image',
    assetId,
    startTime,
    endTime,
    transforms: mergeTransforms(baseTransforms, transformsOverride),
  };
}

/**
 * Audio 클립 생성
 */
export function createAudioClip(options: CreateAudioClipOptions): IAudioClip {
  const {
    name,
    assetId,
    startTime,
    endTime,
    trimStart = 0,
    trimEnd,
    volume = 1,
  } = options;
  const duration = endTime - startTime;

  return {
    id: `clip-${uid(8)}`,
    name,
    type: 'audio',
    assetId,
    startTime,
    endTime,
    trimStart,
    trimEnd: trimEnd ?? duration,
    volume,
  };
}

/**
 * Shape 클립 생성
 */
export function createShapeClip(options: CreateShapeClipOptions): IShapeClip {
  const {
    name,
    startTime,
    endTime,
    shapeData,
    transforms: transformsOverride,
  } = options;

  const baseTransforms: ITransform = {
    position: { x: 0, y: 0 },
    size: { width: shapeData.width, height: shapeData.height },
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    anchorX: 0,
    anchorY: 0,
  };

  return {
    id: `clip-${uid(8)}`,
    name,
    type: 'shape',
    startTime,
    endTime,
    shapeData,
    transforms: mergeTransforms(baseTransforms, transformsOverride),
  };
}

/**
 * Text 클립 생성
 */
export function createTextClip(options: CreateTextClipOptions): ITextClip {
  const {
    name,
    startTime,
    endTime,
    textData,
    transforms: transformsOverride,
  } = options;

  const baseTransforms: ITransform = {
    position: { x: 0, y: 0 },
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    anchorX: 0,
    anchorY: 0,
  };

  return {
    id: `clip-${uid(8)}`,
    name,
    type: 'text',
    startTime,
    endTime,
    textData,
    transforms: mergeTransforms(baseTransforms, transformsOverride),
  };
}
