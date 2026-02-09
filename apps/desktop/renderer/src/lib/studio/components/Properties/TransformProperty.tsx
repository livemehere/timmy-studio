import { AlignPresetButtons } from '../inputs';
import type { ITransform } from '../../domains/Clip/types';
import type { JsonPath, JsonPrimitive } from '../../utils/transformHelpers';
import { MotionNumberInput } from '@/lib/motion-input';
import { useMotionValue, useMotionValueEvent } from 'motion/react';

interface TransformPropertyProps {
  transforms: ITransform;
  onChange: (path: JsonPath, value: JsonPrimitive) => void;
  onChanged?: () => void;
  onBatchChange?: (updates: Partial<ITransform>) => void;
  isTextClip?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}

export function TransformProperty({
  transforms,
  onChange,
  onChanged,
  onBatchChange,
  isTextClip = false,
  canvasWidth = 1920,
  canvasHeight = 1080,
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

  useMotionValueEvent(positionXValue, 'change', (v) => {
    onChange(['position', 'x'], v);
  });

  useMotionValueEvent(positionYValue, 'change', (v) => {
    onChange(['position', 'y'], v);
  });

  useMotionValueEvent(sizeWidthValue, 'change', (v) => {
    onChange(['size', 'width'], v);
  });

  useMotionValueEvent(sizeHeightValue, 'change', (v) => {
    onChange(['size', 'height'], v);
  });

  useMotionValueEvent(scaleXValue, 'change', (v) => {
    onChange(['scaleX'], v);
  });

  useMotionValueEvent(scaleYValue, 'change', (v) => {
    onChange(['scaleY'], v);
  });

  useMotionValueEvent(rotationValue, 'change', (v) => {
    onChange(['rotation'], (v * Math.PI) / 180);
  });

  useMotionValueEvent(opacityValue, 'change', (v) => {
    onChange(['opacity'], v);
  });

  const handleAlignX = (alignX: 'left' | 'center' | 'right') => {
    const xValue =
      alignX === 'left'
        ? 0
        : alignX === 'center'
          ? canvasWidth / 2
          : canvasWidth;

    positionXValue.set(xValue);
    onChanged?.();
  };

  const handleAlignY = (alignY: 'top' | 'center' | 'bottom') => {
    const yValue =
      alignY === 'top'
        ? 0
        : alignY === 'center'
          ? canvasHeight / 2
          : canvasHeight;

    positionYValue.set(yValue);
    onChanged?.();
  };

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
        currentAlignX="center"
        currentAlignY="center"
        onAlignX={handleAlignX}
        onAlignY={handleAlignY}
      />
    </div>
  );
}
