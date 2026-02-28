import { AlignPresetButtons } from '../inputs';
import { SizeFitButtons, type SizeFitMode } from '../inputs/SizeFitButtons';
import type { ITransform, AlignX, AlignY, Size } from '../../domains/Clip/types';
import type { JsonPath, JsonPrimitive } from '../../utils/transformHelpers';
import { MotionNumberInput } from '@/lib/motion-input';
import { useMemo, useCallback, useRef } from 'react';
import { useMotionValue, useMotionValueEvent } from 'motion/react';

interface TransformPropertyProps {
  transforms: ITransform;
  onChange: (path: JsonPath, value: JsonPrimitive) => void;
  onChanged?: () => void;
  onBatchChange?: (updates: Partial<ITransform>) => void;
  isTextClip?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  /** Asset original pixel size (for 'original' reset) */
  originalSize?: Size;
}

export function TransformProperty({
  transforms,
  onChange,
  onChanged,
  onBatchChange,
  isTextClip = false,
  canvasWidth = 1920,
  canvasHeight = 1080,
  originalSize,
}: TransformPropertyProps) {
  const positionXValue = useMotionValue(transforms?.position?.x ?? 0);
  const positionYValue = useMotionValue(transforms?.position?.y ?? 0);
  const sizeWidthValue = useMotionValue(transforms?.size?.width ?? 0);
  const sizeHeightValue = useMotionValue(transforms?.size?.height ?? 0);
  const scaleXValue = useMotionValue(transforms?.scaleX ?? 1);
  const scaleYValue = useMotionValue(transforms?.scaleY ?? 1);
  const rotationValue = useMotionValue(
    transforms?.rotation ? (transforms.rotation * 180) / Math.PI : 0
  );
  const opacityValue = useMotionValue(transforms?.opacity ?? 1);

  // Skip individual onChange during batch operations (fit/align)
  // to avoid stale-closure overwrites
  const skipOnChangeRef = useRef(false);

  useMotionValueEvent(positionXValue, 'change', (v) => {
    if (skipOnChangeRef.current) return;
    onChange(['position', 'x'], v);
  });

  useMotionValueEvent(positionYValue, 'change', (v) => {
    if (skipOnChangeRef.current) return;
    onChange(['position', 'y'], v);
  });

  useMotionValueEvent(sizeWidthValue, 'change', (v) => {
    if (skipOnChangeRef.current) return;
    onChange(['size', 'width'], v);
  });

  useMotionValueEvent(sizeHeightValue, 'change', (v) => {
    if (skipOnChangeRef.current) return;
    onChange(['size', 'height'], v);
  });

  useMotionValueEvent(scaleXValue, 'change', (v) => {
    if (skipOnChangeRef.current) return;
    onChange(['scaleX'], v);
  });

  useMotionValueEvent(scaleYValue, 'change', (v) => {
    if (skipOnChangeRef.current) return;
    onChange(['scaleY'], v);
  });

  useMotionValueEvent(rotationValue, 'change', (v) => {
    if (skipOnChangeRef.current) return;
    onChange(['rotation'], (v * Math.PI) / 180);
  });

  useMotionValueEvent(opacityValue, 'change', (v) => {
    if (skipOnChangeRef.current) return;
    onChange(['opacity'], v);
  });

  // ── Size-fit helpers ──
  const contentW = transforms?.size?.width ?? 0;
  const contentH = transforms?.size?.height ?? 0;

  const handleSizeFit = useCallback(
    (mode: SizeFitMode) => {
      let newWidth = contentW;
      let newHeight = contentH;
      let newScaleX = transforms?.scaleX ?? 1;
      let newScaleY = transforms?.scaleY ?? 1;

      switch (mode) {
        case 'contain': {
          const scale = Math.min(
            canvasWidth / contentW,
            canvasHeight / contentH
          );
          newWidth = contentW;
          newHeight = contentH;
          newScaleX = scale;
          newScaleY = scale;
          break;
        }
        case 'cover': {
          const scale = Math.max(
            canvasWidth / contentW,
            canvasHeight / contentH
          );
          newWidth = contentW;
          newHeight = contentH;
          newScaleX = scale;
          newScaleY = scale;
          break;
        }
        case 'fitWidth': {
          const scale = canvasWidth / contentW;
          newWidth = contentW;
          newHeight = contentH;
          newScaleX = scale;
          newScaleY = scale;
          break;
        }
        case 'fitHeight': {
          const scale = canvasHeight / contentH;
          newWidth = contentW;
          newHeight = contentH;
          newScaleX = scale;
          newScaleY = scale;
          break;
        }
        case 'stretch': {
          newWidth = canvasWidth;
          newHeight = canvasHeight;
          newScaleX = 1;
          newScaleY = 1;
          break;
        }
        case 'original': {
          if (originalSize) {
            newWidth = originalSize.width;
            newHeight = originalSize.height;
          }
          newScaleX = 1;
          newScaleY = 1;
          break;
        }
      }

      // Center after fit
      const rendW = newWidth * newScaleX;
      const rendH = newHeight * newScaleY;
      const newX = (canvasWidth - rendW) / 2;
      const newY = (canvasHeight - rendH) / 2;

      // Batch: skip individual onChange, sync motionValues, then atomic store update
      skipOnChangeRef.current = true;
      sizeWidthValue.set(newWidth);
      sizeHeightValue.set(newHeight);
      scaleXValue.set(newScaleX);
      scaleYValue.set(newScaleY);
      positionXValue.set(newX);
      positionYValue.set(newY);
      skipOnChangeRef.current = false;

      onBatchChange?.({
        size: { width: newWidth, height: newHeight },
        scaleX: newScaleX,
        scaleY: newScaleY,
        position: { x: newX, y: newY },
      });
    },
    [contentW, contentH, canvasWidth, canvasHeight, originalSize, onBatchChange]
  );

  // Detect active fit mode
  const activeFitMode = useMemo<SizeFitMode | null>(() => {
    const sx = transforms?.scaleX ?? 1;
    const sy = transforms?.scaleY ?? 1;
    const w = contentW;
    const h = contentH;
    const T = 0.001;

    if (originalSize && Math.abs(w - originalSize.width) < T && Math.abs(h - originalSize.height) < T && Math.abs(sx - 1) < T && Math.abs(sy - 1) < T) {
      return 'original';
    }
    if (Math.abs(w - canvasWidth) < T && Math.abs(h - canvasHeight) < T && Math.abs(sx - 1) < T && Math.abs(sy - 1) < T) {
      return 'stretch';
    }
    const containS = Math.min(canvasWidth / w, canvasHeight / h);
    if (Math.abs(sx - containS) < T && Math.abs(sy - containS) < T) {
      return 'contain';
    }
    const coverS = Math.max(canvasWidth / w, canvasHeight / h);
    if (Math.abs(sx - coverS) < T && Math.abs(sy - coverS) < T) {
      return 'cover';
    }
    const fitWS = canvasWidth / w;
    if (Math.abs(sx - fitWS) < T && Math.abs(sy - fitWS) < T) {
      return 'fitWidth';
    }
    const fitHS = canvasHeight / h;
    if (Math.abs(sx - fitHS) < T && Math.abs(sy - fitHS) < T) {
      return 'fitHeight';
    }
    return null;
  }, [contentW, contentH, transforms?.scaleX, transforms?.scaleY, canvasWidth, canvasHeight, originalSize]);

  // ── Alignment helpers ──
  const renderedWidth =
    (transforms?.size?.width ?? 0) * (transforms?.scaleX ?? 1);
  const renderedHeight =
    (transforms?.size?.height ?? 0) * (transforms?.scaleY ?? 1);

  const computeAlignX = (ax: AlignX) =>
    ax === 'left'
      ? 0
      : ax === 'center'
        ? (canvasWidth - renderedWidth) / 2
        : canvasWidth - renderedWidth;

  const computeAlignY = (ay: AlignY) =>
    ay === 'top'
      ? 0
      : ay === 'center'
        ? (canvasHeight - renderedHeight) / 2
        : canvasHeight - renderedHeight;

  const handleAlign = (alignX: AlignX, alignY: AlignY) => {
    const newX = computeAlignX(alignX);
    const newY = computeAlignY(alignY);

    skipOnChangeRef.current = true;
    positionXValue.set(newX);
    positionYValue.set(newY);
    skipOnChangeRef.current = false;

    onBatchChange?.({
      position: { x: newX, y: newY },
    });
  };

  // Detect which grid cell is closest to current position
  const THRESHOLD = 2; // px tolerance
  const activeAlignX = useMemo<AlignX | null>(() => {
    const x = transforms?.position?.x ?? 0;
    if (Math.abs(x - computeAlignX('left')) < THRESHOLD) return 'left';
    if (Math.abs(x - computeAlignX('center')) < THRESHOLD) return 'center';
    if (Math.abs(x - computeAlignX('right')) < THRESHOLD) return 'right';
    return null;
  }, [transforms?.position?.x, renderedWidth, canvasWidth]);

  const activeAlignY = useMemo<AlignY | null>(() => {
    const y = transforms?.position?.y ?? 0;
    if (Math.abs(y - computeAlignY('top')) < THRESHOLD) return 'top';
    if (Math.abs(y - computeAlignY('center')) < THRESHOLD) return 'center';
    if (Math.abs(y - computeAlignY('bottom')) < THRESHOLD) return 'bottom';
    return null;
  }, [transforms?.position?.y, renderedHeight, canvasHeight]);

  return (
    <div className="space-y-2">
      <div className="text-xs text-neutral-400 mb-1">Position</div>
      <div className={'flex gap-2'}>
        <MotionNumberInput
          value={positionXValue}
          map={(v) => Number(v.toFixed(2))}
          min={0}
          max={canvasWidth * 2}
          icon={<div className={'text-sm opacity-50'}>X</div>}
          onCommit={() => onChanged?.()}
        />
        <MotionNumberInput
          value={positionYValue}
          map={(v) => Number(v.toFixed(2))}
          min={0}
          max={canvasHeight * 2}
          icon={<div className={'text-sm opacity-50'}>Y</div>}
          onCommit={() => onChanged?.()}
        />
      </div>

      {!isTextClip && (
        <>
          <div className="text-xs text-neutral-400 mb-1 mt-4">Size</div>
          <div className={'flex gap-2'}>
            <MotionNumberInput
              value={sizeWidthValue}
              map={(v) => Math.max(0, Number(v.toFixed(2)))}
              icon={<div className={'text-sm opacity-50'}>W</div>}
              onCommit={() => onChanged?.()}
            />
            <MotionNumberInput
              value={sizeHeightValue}
              map={(v) => Math.max(0, Number(v.toFixed(2)))}
              icon={<div className={'text-sm opacity-50'}>H</div>}
              onCommit={() => onChanged?.()}
            />
          </div>
          <div className="mt-2">
            <SizeFitButtons
              onFit={handleSizeFit}
              activeMode={activeFitMode}
            />
          </div>
        </>
      )}

      <div className="text-xs text-neutral-400 mb-1 mt-4">Scale</div>
      <div className={'flex gap-2'}>
        <MotionNumberInput
          value={scaleXValue}
          map={(v) => Number(v.toFixed(2))}
          min={0.1}
          max={5}
          step={0.1}
          sensitivity={0.1}
          icon={<div className={'text-sm opacity-50'}>X</div>}
          onCommit={() => onChanged?.()}
        />
        <MotionNumberInput
          value={scaleYValue}
          map={(v) => Number(v.toFixed(2))}
          min={0.1}
          max={5}
          step={0.1}
          sensitivity={0.1}
          icon={<div className={'text-sm opacity-50'}>Y</div>}
          onCommit={() => onChanged?.()}
        />
      </div>

      <div className="text-xs text-neutral-400 mb-1 mt-4">Rotation</div>
      <MotionNumberInput
        value={rotationValue}
        map={(v) => Number(v.toFixed(2))}
        min={0}
        max={360}
        step={0.1}
        sensitivity={0.5}
        icon={<div className={'text-sm opacity-50'}>°</div>}
        onCommit={() => onChanged?.()}
      />

      <div className="text-xs text-neutral-400 mb-1 mt-4">Opacity</div>
      <MotionNumberInput
        value={opacityValue}
        map={(v) => Math.max(0, Math.min(1, Number(v.toFixed(2))))}
        min={0}
        max={1}
        step={0.01}
        sensitivity={0.01}
        icon={<div className={'text-sm opacity-50'}>%</div>}
        onCommit={() => onChanged?.()}
      />

      <div className="text-xs text-neutral-400 mb-1 mt-4">Alignment</div>
      <AlignPresetButtons
        onAlign={handleAlign}
        activeAlignX={activeAlignX}
        activeAlignY={activeAlignY}
      />
    </div>
  );
}
