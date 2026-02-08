import { AlignPresetButtons } from '../inputs';
import type { ITransform } from '../../domains/Clip/types';
import type { JsonPath, JsonPrimitive } from '../../utils/transformHelpers';
import { useMotionValue } from 'motion/react';
import { useEffect } from 'react';
import { MotionNumberInput } from '@/lib/motion-input';

interface TransformPropertyProps {
  transforms: ITransform;
  onChange: (path: JsonPath, value: JsonPrimitive) => void;
  onLiveChange?: (path: JsonPath, value: JsonPrimitive) => void;
  onChanged?: () => void;
  onBatchChange?: (updates: Partial<ITransform>) => void;
  isTextClip?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  onInteractionStart?: () => void;
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
  onInteractionStart,
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
      // TODO: undo history push
    } else {
      onChange(['position', 'x'], xValue);
      onChanged?.();
      // TODO: undo history push
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
      // TODO: undo history push
    } else {
      onChange(['position', 'y'], yValue);
      onChanged?.();
      // TODO: undo history push
    }
  };

  const handlePositionXCommit = (v: number) => {
    onChange(['position', 'x'], v);
    onChanged?.();
    // TODO: undo history push
  };

  const handlePositionYCommit = (v: number) => {
    onChange(['position', 'y'], v);
    onChanged?.();
    // TODO: undo history push
  };

  const handlePositionXLive = (v: number) => {
    if (onLiveChange) {
      onLiveChange(['position', 'x'], v);
    }
  };

  const handlePositionYLive = (v: number) => {
    if (onLiveChange) {
      onLiveChange(['position', 'y'], v);
    }
  };

  const handleSizeWidthCommit = (v: number) => {
    onChange(['size', 'width'], v);
    onChanged?.();
    // TODO: undo history push
  };

  const handleSizeHeightCommit = (v: number) => {
    onChange(['size', 'height'], v);
    onChanged?.();
    // TODO: undo history push
  };

  const handleSizeWidthLive = (v: number) => {
    if (onLiveChange) {
      onLiveChange(['size', 'width'], v);
    }
  };

  const handleSizeHeightLive = (v: number) => {
    if (onLiveChange) {
      onLiveChange(['size', 'height'], v);
    }
  };

  const handleScaleXCommit = (v: number) => {
    onChange(['scaleX'], v);
    onChanged?.();
    // TODO: undo history push
  };

  const handleScaleYCommit = (v: number) => {
    onChange(['scaleY'], v);
    onChanged?.();
    // TODO: undo history push
  };

  const handleScaleXLive = (v: number) => {
    if (onLiveChange) {
      onLiveChange(['scaleX'], v);
    }
  };

  const handleScaleYLive = (v: number) => {
    if (onLiveChange) {
      onLiveChange(['scaleY'], v);
    }
  };

  const handleRotationCommit = (v: number) => {
    onChange(['rotation'], (v * Math.PI) / 180);
    onChanged?.();
    // TODO: undo history push
  };

  const handleRotationLive = (v: number) => {
    if (onLiveChange) {
      onLiveChange(['rotation'], (v * Math.PI) / 180);
    }
  };

  const handleOpacityCommit = (v: number) => {
    onChange(['opacity'], v);
    onChanged?.();
    // TODO: undo history push
  };

  const handleOpacityLive = (v: number) => {
    if (onLiveChange) {
      onLiveChange(['opacity'], v);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-neutral-400 mb-1">Position</div>
      <div className={'flex gap-2'}>
        <MotionNumberInput
          value={positionX}
          map={(v) => Number(v.toFixed(2))}
          onLiveChange={handlePositionXLive}
          onCommit={handlePositionXCommit}
          onInteractionStart={onInteractionStart}
          min={0}
          max={canvasWidth * 2}
          icon={<div className={'text-sm opacity-50'}>X</div>}
        />
        <MotionNumberInput
          value={positionY}
          map={(v) => Number(v.toFixed(2))}
          onLiveChange={handlePositionYLive}
          onCommit={handlePositionYCommit}
          onInteractionStart={onInteractionStart}
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
              onLiveChange={handleSizeWidthLive}
              onCommit={handleSizeWidthCommit}
              onInteractionStart={onInteractionStart}
              icon={<div className={'text-sm opacity-50'}>W</div>}
            />
            <MotionNumberInput
              value={sizeHeight}
              map={(v) => Math.max(0, Number(v.toFixed(2)))}
              onLiveChange={handleSizeHeightLive}
              onCommit={handleSizeHeightCommit}
              onInteractionStart={onInteractionStart}
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
          onLiveChange={handleScaleXLive}
          onCommit={handleScaleXCommit}
          onInteractionStart={onInteractionStart}
          min={0.1}
          max={5}
          step={0.1}
          sensitivity={0.1}
          icon={<div className={'text-sm opacity-50'}>X</div>}
        />
        <MotionNumberInput
          value={scaleY}
          map={(v) => Number(v.toFixed(2))}
          onLiveChange={handleScaleYLive}
          onCommit={handleScaleYCommit}
          onInteractionStart={onInteractionStart}
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
        onLiveChange={handleRotationLive}
        onCommit={handleRotationCommit}
        onInteractionStart={onInteractionStart}
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
        onLiveChange={handleOpacityLive}
        onCommit={handleOpacityCommit}
        onInteractionStart={onInteractionStart}
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
