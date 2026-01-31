import { Section, NumberField, AlignPresetButtons } from '../inputs';
import type { ITransform } from '../../domains/Clip/types';
import type { JsonPath, JsonPrimitive } from '../../utils/transformHelpers';

interface TransformsSectionProps {
  transforms: ITransform;
  onChange: (path: JsonPath, value: JsonPrimitive) => void;
  onBatchChange?: (updates: Partial<ITransform>) => void;
  isTextClip?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}

export function TransformsSection({
  transforms,
  onChange,
  onBatchChange,
  isTextClip = false,
  canvasWidth = 1920,
  canvasHeight = 1080,
}: TransformsSectionProps) {
  const getPosition = () => transforms?.position;
  const getSize = () => transforms?.size;
  const getScale = () => ({
    x: transforms?.scaleX ?? 1,
    y: transforms?.scaleY ?? 1,
  });
  const getRotation = () => transforms?.rotation ?? 0;
  const getOpacity = () => transforms?.opacity ?? 1;

  // Anchor와 Position을 함께 조정하는 정렬 핸들러
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
    } else {
      // Fallback: position만 변경
      if (alignX === 'left') {
        onChange(['position', 'x'], 0);
      } else if (alignX === 'center') {
        onChange(['position', 'x'], canvasWidth / 2);
      } else {
        onChange(['position', 'x'], canvasWidth);
      }
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
    } else {
      // Fallback: position만 변경
      if (alignY === 'top') {
        onChange(['position', 'y'], 0);
      } else if (alignY === 'center') {
        onChange(['position', 'y'], canvasHeight / 2);
      } else {
        onChange(['position', 'y'], canvasHeight);
      }
    }
  };

  return (
    <Section title="Transform">
      <div className="text-xs text-neutral-400 mb-1">Position</div>
      <NumberField
        label="X"
        value={getPosition()?.x ?? 0}
        onChange={(value) => onChange(['position', 'x'], value)}
        max={canvasWidth * 2}
        showRange
      />
      <NumberField
        label="Y"
        value={getPosition()?.y ?? 0}
        onChange={(value) => onChange(['position', 'y'], value)}
        max={canvasHeight * 2}
        showRange
      />

      {!isTextClip && (
        <>
          <div className="text-xs text-neutral-400 mb-1 mt-4">Size</div>
          <NumberField
            label="Width"
            value={getSize()?.width ?? 0}
            onChange={(value) => onChange(['size', 'width'], value)}
            showRange
          />
          <NumberField
            label="Height"
            value={getSize()?.height ?? 0}
            onChange={(value) => onChange(['size', 'height'], value)}
            showRange
          />
        </>
      )}

      <div className="text-xs text-neutral-400 mb-1 mt-4">Scale</div>
      <NumberField
        label="X"
        value={getScale().x}
        onChange={(value) => onChange(['scaleX'], value)}
        min={0.1}
        max={5}
        step={0.1}
        showRange
      />
      <NumberField
        label="Y"
        value={getScale().y}
        onChange={(value) => onChange(['scaleY'], value)}
        min={0.1}
        max={5}
        step={0.1}
        showRange
      />

      <div className="text-xs text-neutral-400 mb-1 mt-4">Rotation</div>
      <NumberField
        label="Degrees"
        value={Math.round((getRotation() * 180) / Math.PI)}
        onChange={(value) => onChange(['rotation'], (value * Math.PI) / 180)}
        min={0}
        max={360}
        showRange
      />

      <div className="text-xs text-neutral-400 mb-1 mt-4">Opacity</div>
      <NumberField
        label="Opacity"
        value={getOpacity()}
        onChange={(value) => onChange(['opacity'], value)}
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
    </Section>
  );
}
