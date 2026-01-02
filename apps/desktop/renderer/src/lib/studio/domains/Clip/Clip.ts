import { Container, Sprite } from 'pixi.js';
import { uid } from 'uid';
import type { Renderer } from '@renderer/lib/studio/core/Renderer';
import type { AudioRenderer } from '@renderer/lib/studio/core/AudioRenderer';
import type { TickContext } from '@renderer/lib/studio/core/types';
import type { IAsset } from '../Asset/types';
import type { IShapeData } from '@renderer/lib/studio/types/shape';
import type { ITextData } from '@renderer/lib/studio/types/text';
import type {
  // IGraphicClip,
  ClipType,
  ITransform,
  IBaseClip,
  IVideoClip,
  IImageClip,
  IAudioClip,
  IShapeClip,
  ITextClip,
  IClip,
} from './types';

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

export abstract class Clip {
  static readonly ASSET_PLACEMENT_PRESETS = {
    containCenter: { fit: 'contain', alignX: 'center', alignY: 'center' },

    // Vertical align (top/middle/bottom)
    containTop: { fit: 'contain', alignX: 'center', alignY: 'top' },
    containBottom: { fit: 'contain', alignX: 'center', alignY: 'bottom' },

    // Horizontal align (left/center/right)
    containLeft: { fit: 'contain', alignX: 'left', alignY: 'center' },
    containRight: { fit: 'contain', alignX: 'right', alignY: 'center' },

    // Fit by one axis (keep aspect)
    fitWidthCenter: { fit: 'fitWidth', alignX: 'center', alignY: 'center' },
    fitHeightCenter: { fit: 'fitHeight', alignX: 'center', alignY: 'center' },

    // Fill
    coverCenter: { fit: 'cover', alignX: 'center', alignY: 'center' },
    stretch: { fit: 'stretch', alignX: 'center', alignY: 'center' },
  } as const satisfies Record<string, PlacementPreset>;

  static readonly DEFAULT_CLIP_DURATION_MS = 3000; //ms
  static readonly DEFAULT_TRANSFORM_SIZE = {
    width: 150,
    height: 150,
  };

  abstract readonly type: ClipType;
  public sprite: Sprite;
  public id: string;

  // State for SeekSynchronizer
  public dirty: boolean = false;
  public dirtySessionId: number | null = null;

  protected constructor(
    public readonly renderer: Renderer | AudioRenderer,
    public data: IClip
  ) {
    this.id = data.id;
    this.sprite = new Sprite(); // AudioClip doesn't need this, but keeps it for now
    this.sprite.label = `Clip-${this.id}`;
  }

  abstract init(): Promise<void>;
  abstract update(data: IClip): void;
  abstract destroy(): void;
  abstract tick(ctx: TickContext): void;

  mount(container: Container) {
    container.addChild(this.sprite);
  }

  unmount() {
    this.sprite.parent?.removeChild(this.sprite);
  }

  isVisibleAt(timeMs: number): boolean {
    const trimStart = 'trimStart' in this.data ? (this.data.trimStart ?? 0) : 0;
    const trimEnd = 'trimEnd' in this.data ? (this.data.trimEnd ?? 0) : 0;

    const visibleStart = this.data.startTime + trimStart;
    const visibleEnd = this.data.endTime - trimEnd;

    return timeMs >= visibleStart && timeMs < visibleEnd;
  }

  protected applyTransform(transforms: ITransform): void {
    const sprite = this.sprite;

    // 1) anchor
    if (transforms.anchorX !== undefined || transforms.anchorY !== undefined) {
      sprite.anchor.set(
        transforms.anchorX ?? sprite.anchor.x,
        transforms.anchorY ?? sprite.anchor.y
      );
    }

    // 2) position
    if (transforms.position) {
      sprite.x = transforms.position.x;
      sprite.y = transforms.position.y;
    }

    // 3) base scale (size -> scale)
    let baseScaleX = 1;
    let baseScaleY = 1;

    if (transforms.size) {
      const tex = sprite.texture;
      const srcW = tex?.orig?.width || tex?.width || 0;
      const srcH = tex?.orig?.height || tex?.height || 0;

      if (srcW > 0 && srcH > 0) {
        baseScaleX = transforms.size.width / srcW;
        baseScaleY = transforms.size.height / srcH;
      }
    }

    // 4) user scale
    const userScaleX = transforms.scaleX ?? 1;
    const userScaleY = transforms.scaleY ?? 1;

    sprite.scale.set(baseScaleX * userScaleX, baseScaleY * userScaleY);

    // 5) rotation / alpha
    if (transforms.rotation !== undefined) {
      sprite.rotation = transforms.rotation;
    }
    if (transforms.opacity !== undefined) {
      sprite.alpha = transforms.opacity;
    }
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
    switch (asset.type) {
      case 'video':
      case 'animated-image':
        return {
          ...base,
          transforms: this.createTransformFromAsset(asset),
          type: 'video',
          assetId: asset.id,
          trimStart: 0,
          trimEnd: 0,
        } as IVideoClip;
      case 'image':
        return {
          ...base,
          transforms: this.createTransformFromAsset(asset),
          type: 'image',
          assetId: asset.id,
        } as IImageClip;
      case 'audio':
        return {
          ...base,
          type: 'audio',
          assetId: asset.id,
          trimStart: 0,
          trimEnd: 0,
          volume: 1,
        } as IAudioClip;
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
        size: { ...Clip.DEFAULT_TRANSFORM_SIZE },
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

  static computePlacement({
    total,
    target,
    preset,
  }: {
    total: Size;
    target: Size;
    preset: PlacementPreset;
  }): PlacementResult {
    const totalW = Number(total.width);
    const totalH = Number(total.height);
    const targetW = Number(target.width);
    const targetH = Number(target.height);

    if (
      !Number.isFinite(totalW) ||
      !Number.isFinite(totalH) ||
      !Number.isFinite(targetW) ||
      !Number.isFinite(targetH) ||
      totalW <= 0 ||
      totalH <= 0 ||
      targetW <= 0 ||
      targetH <= 0
    ) {
      return {
        position: { x: 0, y: 0 },
        size: {
          width: Math.max(0, totalW || 0),
          height: Math.max(0, totalH || 0),
        },
      };
    }

    let width = total.width;
    let height = total.height;

    switch (preset.fit) {
      case 'original': {
        width = targetW;
        height = targetH;
        break;
      }
      case 'stretch': {
        width = totalW;
        height = totalH;
        break;
      }
      case 'fitWidth': {
        width = totalW;
        height = (totalW * targetH) / targetW;
        break;
      }
      case 'fitHeight': {
        height = totalH;
        width = (totalH * targetW) / targetH;
        break;
      }
      case 'contain': {
        const scale = Math.min(totalW / targetW, totalH / targetH);
        width = targetW * scale;
        height = targetH * scale;
        break;
      }
      case 'cover': {
        const scale = Math.max(totalW / targetW, totalH / targetH);
        width = targetW * scale;
        height = targetH * scale;
        break;
      }
    }

    const x =
      preset.alignX === 'left'
        ? 0
        : preset.alignX === 'center'
          ? (totalW - width) / 2
          : totalW - width;

    const y =
      preset.alignY === 'top'
        ? 0
        : preset.alignY === 'center'
          ? (totalH - height) / 2
          : totalH - height;

    return {
      position: { x, y },
      size: { width, height },
    };
  }
}
