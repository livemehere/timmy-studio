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

export abstract class Clip {
  static readonly DEFAULT_CLIP_DURATION_MS = 3000; //ms
  static readonly DEFAULT_TRANSFORM_SIZE = {
    width: 150,
    height: 150,
  };

  abstract readonly type: ClipType;
  public id: string;

  public dirty: boolean = false;
  public dirtySessionId: number | null = null;

  protected constructor(
    public readonly renderer: GraphicRenderer | AudioRenderer,
    public data: IClip
  ) {
    this.id = data.id;
  }

  abstract init(): Promise<void>;
  abstract update(data: IClip): void;
  abstract destroy(): void;
  abstract tick(ctx: TickContext): void;

  isVisibleAt(timeMs: number): boolean {
    const trimStart = 'trimStart' in this.data ? (this.data.trimStart ?? 0) : 0;
    const trimEnd = 'trimEnd' in this.data ? (this.data.trimEnd ?? 0) : 0;

    const visibleStart = this.data.startTime + trimStart;
    const visibleEnd = this.data.endTime - trimEnd;

    return timeMs >= visibleStart && timeMs < visibleEnd;
  }

  shouldRender(timeMs: number): boolean {
    return this.data.enabled && this.isVisibleAt(timeMs);
  }

  // --------------------------------------------------------------------------
  // Static Factory & Utility Methods
  // --------------------------------------------------------------------------

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

  static ClipTypeToTrackType(type: ClipType): TrackType {
    if (type === 'audio') return 'audio';
    return 'graphic';
  }
}
