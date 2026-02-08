import { AlignPresetButtons } from '../inputs';
import type { ITransform } from '../../domains/Clip/types';
import type { JsonPath, JsonPrimitive } from '../../utils/transformHelpers';
import { useEffect } from 'react';
import { RtNumberInput } from '@/lib/motion-input';

interface TransformPropertyProps {
  transforms: ITransform;
  onChange: (path: JsonPath, value: JsonPrimitive) => void;
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
  onChanged,
  onBatchChange,
  isTextClip = false,
  canvasWidth = 1920,
  canvasHeight = 1080,
  onInteractionStart,
}: TransformPropertyProps) {
  const handleAlignX = (alignX: 'left' | 'center' | 'right') => {
    const xValue =
      alignX === 'left'
        ? 0
        : alignX === 'center'
          ? canvasWidth / 2
          : canvasWidth;

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

  const handleRotationCommit = (v: number) => {
    onChange(['rotation'], (v * Math.PI) / 180);
    onChanged?.();
    // TODO: undo history push
  };

  const handleOpacityCommit = (v: number) => {
    onChange(['opacity'], v);
    onChanged?.();
    // TODO: undo history push
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-neutral-400 mb-1">Position</div>
      <div className={'flex gap-2'}>
        <RtNumberInput
          defaultValue={transforms?.position?.x ?? 0}
          map={(v) => Number(v.toFixed(2))}
          onChange={(v) => onChange(['position', 'x'], v)}
          onCommit={handlePositionXCommit}
          onInteractionStart={onInteractionStart}
          min={0}
          max={canvasWidth * 2}
          icon={<div className={'text-sm opacity-50'}>X</div>}
        />
        <RtNumberInput
          defaultValue={transforms?.position?.y ?? 0}
          map={(v) => Number(v.toFixed(2))}
          onChange={(v) => onChange(['position', 'y'], v)}
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
            <RtNumberInput
              defaultValue={transforms?.size?.width ?? 0}
              map={(v) => Math.max(0, Number(v.toFixed(2)))}
              onChange={(v) => onChange(['size', 'width'], v)}
              onCommit={handleSizeWidthCommit}
              onInteractionStart={onInteractionStart}
              icon={<div className={'text-sm opacity-50'}>W</div>}
            />
            <RtNumberInput
              defaultValue={transforms?.size?.height ?? 0}
              map={(v) => Math.max(0, Number(v.toFixed(2)))}
              onChange={(v) => onChange(['size', 'height'], v)}
              onCommit={handleSizeHeightCommit}
              onInteractionStart={onInteractionStart}
              icon={<div className={'text-sm opacity-50'}>H</div>}
            />
          </div>
        </>
      )}

      <div className="text-xs text-neutral-400 mb-1 mt-4">Scale</div>
      <div className={'flex gap-2'}>
        <RtNumberInput
          defaultValue={transforms?.scaleX ?? 1}
          map={(v) => Number(v.toFixed(2))}
          onChange={(v) => onChange(['scaleX'], v)}
          onCommit={handleScaleXCommit}
          onInteractionStart={onInteractionStart}
          min={0.1}
          max={5}
          step={0.1}
          sensitivity={0.1}
          icon={<div className={'text-sm opacity-50'}>X</div>}
        />
        <RtNumberInput
          defaultValue={transforms?.scaleY ?? 1}
          map={(v) => Number(v.toFixed(2))}
          onChange={(v) => onChange(['scaleY'], v)}
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
      <RtNumberInput
        defaultValue={
          transforms?.rotation ? (transforms.rotation * 180) / Math.PI : 0
        }
        map={(v) => Number(v.toFixed(2))}
        onChange={(v) => onChange(['rotation'], (v * Math.PI) / 180)}
        onCommit={handleRotationCommit}
        onInteractionStart={onInteractionStart}
        min={0}
        max={360}
        step={0.1}
        sensitivity={0.5}
        icon={<div className={'text-sm opacity-50'}>°</div>}
      />

      <div className="text-xs text-neutral-400 mb-1 mt-4">Opacity</div>
      <RtNumberInput
        defaultValue={transforms?.opacity ?? 1}
        map={(v) => Math.max(0, Math.min(1, Number(v.toFixed(2))))}
        onChange={(v) => onChange(['opacity'], v)}
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
