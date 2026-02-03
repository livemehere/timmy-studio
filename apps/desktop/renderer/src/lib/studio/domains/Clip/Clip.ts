import { uid } from 'uid';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import type { Dirtyable, TickContext } from '@/lib/studio/engine/types';
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
> implements Dirtyable
{
  static DEBUG_LIFECYCLE = false;
  static readonly DEFAULT_CLIP_DURATION_MS = 5000; //ms
  static readonly DEFAULT_TRANSFORM_SIZE = {
    width: 150,
    height: 150,
  };

  abstract readonly type: ClipType;
  readonly id: string;
  readonly renderer: TRenderer;

  dirty: boolean = false;
  dirtySessionId: number | null = null;
  protected _data: TClipData;
  private lastTickTime: number | null = null;
  private lastTickVisible = false;
  private lifecycleCounts = new Map<string, number>();

  get data(): TClipData {
    return this._data;
  }

  protected constructor(renderer: TRenderer, data: TClipData) {
    this.id = data.id;
    this.renderer = renderer;
    this._data = data;
    this.debugCall('(Clip) constructor');
  }

  abstract init(): Promise<void>;
  abstract destroy(): void;
  abstract sync(newData: TClipData): void;

  protected abstract applyData(): void; // sync 시 1회 실행: effects, filters 등 구조 재구축
  abstract onBecameVisible(ctx: TickContext): void;
  abstract onBecameHidden(ctx: TickContext): void;
  abstract onTick(ctx: TickContext): void;

  protected debugCall(hook: string): void {
    if (!Clip.DEBUG_LIFECYCLE) return;
    const next = (this.lifecycleCounts.get(hook) ?? 0) + 1;
    this.lifecycleCounts.set(hook, next);
    console.log(
      `[DebugCall] clip(${this.id}) type(${this.type}) ${hook} #${next}`
    );
  }

  protected isInRangeAt(timeMs: number): boolean {
    // startTime/endTime은 타임라인 상의 클립 위치를 나타냄
    // trimStart/trimEnd는 소스 미디어의 재생 오프셋으로만 사용됨 (visibility에 영향 없음)
    return timeMs >= this._data.startTime && timeMs < this._data.endTime;
  }

  shouldRenderAt(timeMs: number): boolean {
    return this._data.enabled && this.isInRangeAt(timeMs);
  }

  // ⚠️ track 에서 호출해주고, 직접 호출 절대 하면 안됨
  prepareTick(ctx: TickContext): {
    isVisible: boolean;
    becameVisible: boolean;
    becameHidden: boolean;
    isFirstTick: boolean;
  } {
    const isFirstTick = this.lastTickTime === null;
    if (this.lastTickTime === ctx.currentTime) {
      return {
        isVisible: this.lastTickVisible,
        becameVisible: false,
        becameHidden: false,
        isFirstTick,
      };
    }

    const wasVisible = this.lastTickVisible;
    const isVisible = this.shouldRenderAt(ctx.currentTime);

    this.lastTickTime = ctx.currentTime;
    this.lastTickVisible = isVisible;

    return {
      isVisible,
      becameVisible: isFirstTick ? false : isVisible && !wasVisible,
      becameHidden: isFirstTick ? false : !isVisible && wasVisible,
      isFirstTick,
    };
  }

  private static createBaseClipFromAsset(asset: IAsset): IBaseClip {
    const durationMs =
      asset.type !== 'shape' && asset.type !== 'text'
        ? (asset.metadata.durationMs ?? Clip.DEFAULT_CLIP_DURATION_MS)
        : Clip.DEFAULT_CLIP_DURATION_MS;

    return {
      id: uid(8),
      name: asset.name,
      startTime: 0,
      endTime: durationMs,
      effects: [],
      animations: [],
      enabled: true,
      trimStart: 0,
      trimEnd: 0,
    };
  }

  private static createTransformFromAsset(asset: IAsset): ITransform {
    const width =
      asset.type !== 'shape' && asset.type !== 'text'
        ? asset.metadata.width
        : Clip.DEFAULT_TRANSFORM_SIZE.width;
    const height =
      asset.type !== 'shape' && asset.type !== 'text'
        ? asset.metadata.height
        : Clip.DEFAULT_TRANSFORM_SIZE.height;

    return {
      position: { x: 0, y: 0 },
      size: {
        width,
        height,
      },
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 1,
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
        };
        return videoClip;
      case 'image':
        const imageClip: IImageClip = {
          ...base,
          transforms,
          type: 'image',
          assetId: asset.id,
        };
        return imageClip;
      case 'animated-image':
        const animatedImageClip: IAnimatedImageClip = {
          ...base,
          transforms,
          type: 'animated-image',
          assetId: asset.id,
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
      transforms: {
        position: { x: 0, y: 0 },
        size: { width: shapeData.width, height: shapeData.height },
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
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
      transforms: {
        position: { x: 0, y: 0 },
        size: { ...Clip.DEFAULT_TRANSFORM_SIZE },
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
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
