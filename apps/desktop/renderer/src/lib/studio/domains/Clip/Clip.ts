import { uid } from 'uid';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import type { TickContext } from '@/lib/studio/engine/types';
import type { IAsset } from '../Asset/types';
import type { IShapeData } from '@/lib/studio/types/shape';
import type { ITextData } from '@/lib/studio/types/text';
import type {
  ClipType,
  IAnimatedImageClip,
  IAudioClip,
  IBaseClip,
  IClip,
  IImageClip,
  IShapeClip,
  ITextClip,
  ITransform,
  IVideoClip,
} from './types';
import type { AudioRenderer } from '@/lib/studio/engine/AudioRenderer';
import type { TrackType } from '@/lib/studio/domains/Track/types';

export abstract class Clip<
  TClipData extends IClip = IClip,
  TRenderer extends GraphicRenderer | AudioRenderer =
    | GraphicRenderer
    | AudioRenderer,
> {
  static readonly DEFAULT_CLIP_DURATION_MS = 3000; //ms
  static readonly DEFAULT_TRANSFORM_SIZE = {
    width: 150,
    height: 150,
  };

  abstract readonly type: ClipType;
  readonly id: string;
  readonly renderer: TRenderer;

  dirty: boolean = false;
  dirtySessionId: number | null = null;
  data: TClipData;

  protected constructor(renderer: TRenderer, data: TClipData) {
    this.id = data.id;
    this.renderer = renderer;
    this.data = data;
  }

  abstract init(): Promise<void>;
  abstract destroy(): void;

  // Track 에서 흐름을 제어하기 위한 hook
  abstract shouldUpdateOnTick(ctx: TickContext): boolean;
  abstract updateOnTick(ctx: TickContext): void;
  abstract shouldClipTick(ctx: TickContext): boolean;

  // GraphicClip, AudioClip 1단계 상속 레벨에서 구현
  abstract tick(ctx: TickContext): void;
  // 2단계 상속 클래스들에서 구현 (ShapeClip, TextClip, VideoClip, ImageClip...)
  abstract sync(newData: TClipData): void;

  protected isVisibleAt(timeMs: number): boolean {
    const trimStart = 'trimStart' in this.data ? (this.data.trimStart ?? 0) : 0;
    const trimEnd = 'trimEnd' in this.data ? (this.data.trimEnd ?? 0) : 0;

    const visibleStart = this.data.startTime + trimStart;
    const visibleEnd = this.data.endTime - trimEnd;

    return timeMs >= visibleStart && timeMs < visibleEnd;
  }

  protected shouldRender(timeMs: number): boolean {
    return this.data.enabled && this.isVisibleAt(timeMs);
  }

  private static createBaseClipFromAsset(asset: IAsset): IBaseClip {
    return {
      id: uid(8),
      name: asset.name,
      startTime: 0,
      endTime: asset.metadata.durationMs ?? Clip.DEFAULT_CLIP_DURATION_MS,
      effects: [],
      animations: [],
      enabled: true,
      trimStart: 0,
      trimEnd: 0,
    };
  }

  private static createTransformFromAsset(asset: IAsset): ITransform {
    return {
      position: { x: 0, y: 0 },
      size: {
        width: asset.metadata.width ?? Clip.DEFAULT_TRANSFORM_SIZE.width,
        height: asset.metadata.height ?? Clip.DEFAULT_TRANSFORM_SIZE.height,
      },
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 1,
      anchorX: 0,
      anchorY: 0,
    };
  }

  static createFromAsset(asset: IAsset) {
    const base = this.createBaseClipFromAsset(asset);
    const transforms = this.createTransformFromAsset(asset);
    switch (asset.type) {
      case 'video':
        const videoClip: IVideoClip = {
          ...base,
          transforms,
          type: 'video',
          assetId: asset.id,
          trimStart: 0,
          trimEnd: 0,
          zIndex: 0,
        };
        return videoClip;
      case 'image':
        const imageClip: IImageClip = {
          ...base,
          transforms,
          type: 'image',
          assetId: asset.id,
          zIndex: 0,
        };
        return imageClip;
      case 'animated-image':
        const animatedImageClip: IAnimatedImageClip = {
          ...base,
          transforms,
          type: 'animated-image',
          assetId: asset.id,
          zIndex: 0,
        };
        return animatedImageClip;
      case 'audio':
        const audioClip: IAudioClip = {
          ...base,
          type: 'audio',
          assetId: asset.id,
          trimStart: 0,
          trimEnd: 0,
          volume: 1,
        };
        return audioClip;
      default:
        throw new Error('Unsupported asset type for clip creation');
    }
  }

  static createShape(shapeData: IShapeData): IShapeClip {
    return {
      id: uid(8),
      name: shapeData.shapeType,
      startTime: 0,
      endTime: Clip.DEFAULT_CLIP_DURATION_MS,
      trimStart: 0,
      trimEnd: 0,
      enabled: true,
      effects: [],
      animations: [],
      zIndex: 0,
      transforms: {
        position: { x: 0, y: 0 },
        size: { width: shapeData.width, height: shapeData.height },
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        anchorX: 0,
        anchorY: 0,
      },
      type: 'shape',
      shapeData,
    };
  }

  static createText(textData: ITextData): ITextClip {
    return {
      id: uid(8),
      name: textData.content.substring(0, 10) || 'Text Clip',
      startTime: 0,
      endTime: Clip.DEFAULT_CLIP_DURATION_MS,
      trimStart: 0,
      trimEnd: 0,
      enabled: true,
      effects: [],
      animations: [],
      zIndex: 0,
      transforms: {
        position: { x: 0, y: 0 },
        size: { ...Clip.DEFAULT_TRANSFORM_SIZE },
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        anchorX: 0,
        anchorY: 0,
      },
      type: 'text',
      textData,
    };
  }

  static convertClipTypeToTrackType(type: ClipType): TrackType {
    if (type === 'audio') return 'audio';
    return 'graphic';
  }
}
