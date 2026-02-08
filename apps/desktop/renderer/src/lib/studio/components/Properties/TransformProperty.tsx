import { NumberField, AlignPresetButtons } from '../inputs';
import type { ITransform } from '../../domains/Clip/types';
import type { JsonPath, JsonPrimitive } from '../../utils/transformHelpers';

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
  const getPosition = () => transforms?.position;
  const getSize = () => transforms?.size;
  const getScale = () => ({
    x: transforms?.scaleX ?? 1,
    y: transforms?.scaleY ?? 1,
  });
  const getRotation = () => transforms?.rotation ?? 0;
  const getOpacity = () => transforms?.opacity ?? 1;

  const handleAlignX = (alignX: 'left' | 'center' | 'right') => {
    if (onBatchChange) {
      const updates: Partial<ITransform> = {
        position: { ...transforms.position } as { x: number; y: number },
      };

      if (alignX === 'left') {
        updates.position!.x = 0;
      } else if (alignX === 'center') {
        updates.position!.x = canvasWidth / 2;
      } else {
        updates.position!.x = canvasWidth;
      }

      onBatchChange(updates);
      onChanged?.();
    } else {
      if (alignX === 'left') {
        onChange(['position', 'x'], 0);
      } else if (alignX === 'center') {
        onChange(['position', 'x'], canvasWidth / 2);
      } else {
        onChange(['position', 'x'], canvasWidth);
      }
      onChanged?.();
    }
  };

  const handleAlignY = (alignY: 'top' | 'center' | 'bottom') => {
    if (onBatchChange) {
      const updates: Partial<ITransform> = {
        position: { ...transforms.position } as { x: number; y: number },
      };

      if (alignY === 'top') {
        updates.position!.y = 0;
      } else if (alignY === 'center') {
        updates.position!.y = canvasHeight / 2;
      } else {
        updates.position!.y = canvasHeight;
      }

      onBatchChange(updates);
      onChanged?.();
    } else {
      if (alignY === 'top') {
        onChange(['position', 'y'], 0);
      } else if (alignY === 'center') {
        onChange(['position', 'y'], canvasHeight / 2);
      } else {
        onChange(['position', 'y'], canvasHeight);
      }
      onChanged?.();
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-neutral-400 mb-1">Position</div>
      <NumberField
        label="X"
        value={getPosition()?.x ?? 0}
        onChange={(value) => {
          onChange(['position', 'x'], value);
          onChanged?.();
        }}
        onLiveChange={
          onLiveChange
            ? (value) => onLiveChange(['position', 'x'], value)
            : undefined
        }
        max={canvasWidth * 2}
        showRange
      />
      <NumberField
        label="Y"
        value={getPosition()?.y ?? 0}
        onChange={(value) => {
          onChange(['position', 'y'], value);
          onChanged?.();
        }}
        onLiveChange={
          onLiveChange
            ? (value) => onLiveChange(['position', 'y'], value)
            : undefined
        }
        max={canvasHeight * 2}
        showRange
      />

      {!isTextClip && (
        <>
          <div className="text-xs text-neutral-400 mb-1 mt-4">Size</div>
          <NumberField
            label="Width"
            value={getSize()?.width ?? 0}
            onChange={(value) => {
              onChange(['size', 'width'], value);
              onChanged?.();
            }}
            onLiveChange={
              onLiveChange
                ? (value) => onLiveChange(['size', 'width'], value)
                : undefined
            }
            showRange
          />
          <NumberField
            label="Height"
            value={getSize()?.height ?? 0}
            onChange={(value) => {
              onChange(['size', 'height'], value);
              onChanged?.();
            }}
            onLiveChange={
              onLiveChange
                ? (value) => onLiveChange(['size', 'height'], value)
                : undefined
            }
            showRange
          />
        </>
      )}

      <div className="text-xs text-neutral-400 mb-1 mt-4">Scale</div>
      <NumberField
        label="X"
        value={getScale().x}
        onChange={(value) => {
          onChange(['scaleX'], value);
          onChanged?.();
        }}
        onLiveChange={
          onLiveChange ? (value) => onLiveChange(['scaleX'], value) : undefined
        }
        min={0.1}
        max={5}
        step={0.1}
        showRange
      />
      <NumberField
        label="Y"
        value={getScale().y}
        onChange={(value) => {
          onChange(['scaleY'], value);
          onChanged?.();
        }}
        onLiveChange={
          onLiveChange ? (value) => onLiveChange(['scaleY'], value) : undefined
        }
        min={0.1}
        max={5}
        step={0.1}
        showRange
      />

      <div className="text-xs text-neutral-400 mb-1 mt-4">Rotation</div>
      <NumberField
        label="Degrees"
        value={Math.round((getRotation() * 180) / Math.PI)}
        onChange={(value) => {
          onChange(['rotation'], (value * Math.PI) / 180);
          onChanged?.();
        }}
        onLiveChange={
          onLiveChange
            ? (value) => onLiveChange(['rotation'], (value * Math.PI) / 180)
            : undefined
        }
        min={0}
        max={360}
        showRange
      />

      <div className="text-xs text-neutral-400 mb-1 mt-4">Opacity</div>
      <NumberField
        label="Opacity"
        value={getOpacity()}
        onChange={(value) => {
          onChange(['opacity'], value);
          onChanged?.();
        }}
        onLiveChange={
          onLiveChange ? (value) => onLiveChange(['opacity'], value) : undefined
        }
        min={0}
        max={1}
        step={0.1}
        showRange
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
