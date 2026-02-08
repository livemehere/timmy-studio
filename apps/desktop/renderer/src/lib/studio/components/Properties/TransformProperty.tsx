import { AlignPresetButtons } from '../inputs';
import type { ITransform } from '../../domains/Clip/types';
import type { JsonPath, JsonPrimitive } from '../../utils/transformHelpers';
import { useMotionValue, useMotionValueEvent } from 'motion/react';
import { useEffect } from 'react';
import { MotionNumberInput } from '@/components/motion-number-input';

interface TransformPropertyProps {
  transforms: ITransform;
  onChange: (path: JsonPath, value: JsonPrimitive) => void;
  onLiveChange?: (path: JsonPath, value: JsonPrimitive) => void;
  onChanged?: () => void;
  onBatchChange?: (updates: Partial<ITransform>) => void;
  isTextClip?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}

export function TransformProperty({
  transforms,
  onChange,
  onLiveChange,
  onChanged,
  onBatchChange,
  isTextClip = false,
  canvasWidth = 1920,
  canvasHeight = 1080,
}: TransformPropertyProps) {
  const positionX = useMotionValue(transforms?.position?.x ?? 0);
  const positionY = useMotionValue(transforms?.position?.y ?? 0);
  const sizeWidth = useMotionValue(transforms?.size?.width ?? 0);
  const sizeHeight = useMotionValue(transforms?.size?.height ?? 0);
  const scaleX = useMotionValue(transforms?.scaleX ?? 1);
  const scaleY = useMotionValue(transforms?.scaleY ?? 1);
  const rotation = useMotionValue(
    transforms?.rotation ? (transforms.rotation * 180) / Math.PI : 0
  );
  const opacity = useMotionValue(transforms?.opacity ?? 1);

  useEffect(() => {
    positionX.set(transforms?.position?.x ?? 0);
    positionY.set(transforms?.position?.y ?? 0);
    sizeWidth.set(transforms?.size?.width ?? 0);
    sizeHeight.set(transforms?.size?.height ?? 0);
    scaleX.set(transforms?.scaleX ?? 1);
    scaleY.set(transforms?.scaleY ?? 1);
    rotation.set(
      transforms?.rotation ? (transforms.rotation * 180) / Math.PI : 0
    );
    opacity.set(transforms?.opacity ?? 1);
  }, [transforms]);

  useMotionValueEvent(positionX, 'change', (v) => {
    if (onLiveChange) {
      onLiveChange(['position', 'x'], v);
    }
  });

  useMotionValueEvent(positionY, 'change', (v) => {
    if (onLiveChange) {
      onLiveChange(['position', 'y'], v);
    }
  });

  useMotionValueEvent(sizeWidth, 'change', (v) => {
    if (onLiveChange) {
      onLiveChange(['size', 'width'], v);
    }
  });

  useMotionValueEvent(sizeHeight, 'change', (v) => {
    if (onLiveChange) {
      onLiveChange(['size', 'height'], v);
    }
  });

  useMotionValueEvent(scaleX, 'change', (v) => {
    if (onLiveChange) {
      onLiveChange(['scaleX'], v);
    }
  });

  useMotionValueEvent(scaleY, 'change', (v) => {
    if (onLiveChange) {
      onLiveChange(['scaleY'], v);
    }
  });

  useMotionValueEvent(rotation, 'change', (v) => {
    if (onLiveChange) {
      onLiveChange(['rotation'], (v * Math.PI) / 180);
    }
  });

  useMotionValueEvent(opacity, 'change', (v) => {
    if (onLiveChange) {
      onLiveChange(['opacity'], v);
    }
  });

  const handleAlignX = (alignX: 'left' | 'center' | 'right') => {
    const xValue =
      alignX === 'left'
        ? 0
        : alignX === 'center'
          ? canvasWidth / 2
          : canvasWidth;

    positionX.set(xValue);

    if (onBatchChange) {
      const updates: Partial<ITransform> = {
        position: { ...transforms.position } as { x: number; y: number },
      };
      updates.position!.x = xValue;
      onBatchChange(updates);
      onChanged?.();
    } else {
      onChange(['position', 'x'], xValue);
      onChanged?.();
    }
  };

  const handleAlignY = (alignY: 'top' | 'center' | 'bottom') => {
    const yValue =
      alignY === 'top'
        ? 0
        : alignY === 'center'
          ? canvasHeight / 2
          : canvasHeight;

    positionY.set(yValue);

    if (onBatchChange) {
      const updates: Partial<ITransform> = {
        position: { ...transforms.position } as { x: number; y: number },
      };
      updates.position!.y = yValue;
      onBatchChange(updates);
      onChanged?.();
    } else {
      onChange(['position', 'y'], yValue);
      onChanged?.();
    }
  };

  const handlePositionXChange = (v: number) => {
    onChange(['position', 'x'], v);
    onChanged?.();
  };

  const handlePositionYChange = (v: number) => {
    onChange(['position', 'y'], v);
    onChanged?.();
  };

  const handleSizeWidthChange = (v: number) => {
    onChange(['size', 'width'], v);
    onChanged?.();
  };

  const handleSizeHeightChange = (v: number) => {
    onChange(['size', 'height'], v);
    onChanged?.();
  };

  const handleScaleXChange = (v: number) => {
    onChange(['scaleX'], v);
    onChanged?.();
  };

  const handleScaleYChange = (v: number) => {
    onChange(['scaleY'], v);
    onChanged?.();
  };

  const handleRotationChange = (v: number) => {
    onChange(['rotation'], (v * Math.PI) / 180);
    onChanged?.();
  };

  const handleOpacityChange = (v: number) => {
    onChange(['opacity'], v);
    onChanged?.();
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-neutral-400 mb-1">Position</div>
      <div className={'flex gap-2'}>
        <MotionNumberInput
          value={positionX}
          map={(v) => Number(v.toFixed(2))}
          onChange={handlePositionXChange}
          min={0}
          max={canvasWidth * 2}
          icon={<div className={'text-sm opacity-50'}>X</div>}
        />
        <MotionNumberInput
          value={positionY}
          map={(v) => Number(v.toFixed(2))}
          onChange={handlePositionYChange}
          min={0}
          max={canvasHeight * 2}
          icon={<div className={'text-sm opacity-50'}>Y</div>}
        />
      </div>

      {!isTextClip && (
        <>
          <div className="text-xs text-neutral-400 mb-1 mt-4">Size</div>
          <div className={'flex gap-2'}>
            <MotionNumberInput
              value={sizeWidth}
              map={(v) => Math.max(0, Number(v.toFixed(2)))}
              onChange={handleSizeWidthChange}
              icon={<div className={'text-sm opacity-50'}>W</div>}
            />
            <MotionNumberInput
              value={sizeHeight}
              map={(v) => Math.max(0, Number(v.toFixed(2)))}
              onChange={handleSizeHeightChange}
              icon={<div className={'text-sm opacity-50'}>H</div>}
            />
          </div>
        </>
      )}

      <div className="text-xs text-neutral-400 mb-1 mt-4">Scale</div>
      <div className={'flex gap-2'}>
        <MotionNumberInput
          value={scaleX}
          map={(v) => Number(v.toFixed(2))}
          onChange={handleScaleXChange}
          min={0.1}
          max={5}
          step={0.1}
          sensitivity={0.1}
          icon={<div className={'text-sm opacity-50'}>X</div>}
        />
        <MotionNumberInput
          value={scaleY}
          map={(v) => Number(v.toFixed(2))}
          onChange={handleScaleYChange}
          min={0.1}
          max={5}
          step={0.1}
          sensitivity={0.1}
          icon={<div className={'text-sm opacity-50'}>Y</div>}
        />
      </div>

      <div className="text-xs text-neutral-400 mb-1 mt-4">Rotation</div>
      <MotionNumberInput
        value={rotation}
        map={(v) => Number(v.toFixed(2))}
        onChange={handleRotationChange}
        min={0}
        max={360}
        step={0.1}
        sensitivity={0.5}
        icon={<div className={'text-sm opacity-50'}>°</div>}
      />

      <div className="text-xs text-neutral-400 mb-1 mt-4">Opacity</div>
      <MotionNumberInput
        value={opacity}
        map={(v) => Math.max(0, Math.min(1, Number(v.toFixed(2))))}
        onChange={handleOpacityChange}
        min={0}
        max={1}
        step={0.01}
        sensitivity={0.01}
        icon={<div className={'text-sm opacity-50'}>%</div>}
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
