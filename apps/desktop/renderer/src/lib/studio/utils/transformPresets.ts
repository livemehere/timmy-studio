import type { ITransform } from '@renderer/lib/studio/types/types';

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

export const ASSET_PLACEMENT_PRESETS = {
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

export function computePlacement(
  total: Size,
  target: Size,
  preset: PlacementPreset
): PlacementResult {
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

  let width = targetW;
  let height = targetH;

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

export function computeTransformFromPreset(args: {
  total: Size;
  target: Size;
  preset: PlacementPreset;
}): Pick<ITransform, 'position' | 'size'> {
  const { position, size } = computePlacement(
    args.total,
    args.target,
    args.preset
  );
  return { position, size };
}
