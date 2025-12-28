import type { IAsset } from '@renderer/lib/studio/domains/Asset/types';
import type {
  IAudioClip,
  IBaseClip,
  IImageClip,
  IShapeClip,
  ITextClip,
  ITransform,
  IVideoClip,
} from '@renderer/lib/studio/domains/Clip/types';
import { uid } from 'uid';
import type { IShapeData } from '@renderer/lib/studio/types/shape';
import type { ITextData } from '@renderer/lib/studio/types/text';

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

export class ClipUtils {
  static ASSET_PLACEMENT_PRESETS = {
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

  static DEFAULT_CLIP_DURATION_MS = 3000; //ms
  static DEFAULT_TRANSFORM_SIZE = {
    width: 150,
    height: 150,
  };

  private static createBaseClipFromAsset(asset: IAsset): IBaseClip {
    return {
      id: uid(8),
      name: asset.name,
      startTime: 0,
      endTime: asset.metadata.durationMs ?? ClipUtils.DEFAULT_CLIP_DURATION_MS,
      effects: [],
      animations: [],
    };
  }

  private static createTransformFromAsset(asset: IAsset): ITransform {
    return {
      position: { x: 0, y: 0 },
      size: {
        width: asset.metadata.width ?? ClipUtils.DEFAULT_TRANSFORM_SIZE.width,
        height:
          asset.metadata.height ?? ClipUtils.DEFAULT_TRANSFORM_SIZE.height,
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
          trimEnd: asset.metadata.durationMs,
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
          trimEnd: asset.metadata.durationMs!,
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
      endTime: ClipUtils.DEFAULT_CLIP_DURATION_MS,
      effects: [],
      animations: [],
      transforms: {
        position: { x: 0, y: 0 },
        size: { ...ClipUtils.DEFAULT_TRANSFORM_SIZE },
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
      endTime: ClipUtils.DEFAULT_CLIP_DURATION_MS,
      effects: [],
      animations: [],
      transforms: {
        position: { x: 0, y: 0 },
        size: { ...ClipUtils.DEFAULT_TRANSFORM_SIZE },
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
