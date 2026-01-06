import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import type {
  IClip,
  IGraphicClip,
  ITextClip,
  IShapeClip,
  IAudioClip,
} from '@renderer/lib/studio/domains/Clip/types';
import { Section, InputField, NumberField, ToggleField } from '../inputs';
import { TransformsSection } from '../Properties/TransformsSection';
import { TextPropertiesSection } from '../Properties/TextPropertiesSection';
import { ShapePropertiesSection } from '../Properties/ShapePropertiesSection';
import { EffectsSection } from '../Properties/EffectsSection';
import { findClipInTracks } from '../../utils/clipHelpers';
import {
  updateTransformAtPath,
  type JsonPath,
  type JsonPrimitive,
} from '../../utils/transformHelpers';

export function PropertiesPanel() {
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);
  const tracks = useDocStore((state) => state.tracks);
  const updateClipInTrack = useDocStore((state) => state.updateClip);
  const settings = useDocStore((state) => state.settings);

  const selectedClipId = selectedClipIds[0];
  if (!selectedClipId) {
    return (
      <div className="p-4 text-center text-neutral-500 text-sm">
        Select a clip to edit properties
      </div>
    );
  }

  const result = findClipInTracks(tracks, selectedClipId);
  if (!result) {
    return (
      <div className="p-4 text-center text-neutral-500 text-sm">
        Clip not found
      </div>
    );
  }

  const { clip, trackId } = result;
  const canvasWidth = settings.width;
  const canvasHeight = settings.height;

  const updateClip = (updates: Partial<IClip>) => {
    updateClipInTrack(trackId, clip.id, updates);
  };

  const isGraphicClip = clip.type !== 'audio';
  const graphicClip = isGraphicClip ? (clip as IGraphicClip) : null;
  const textClip = clip.type === 'text' ? (clip as ITextClip) : null;
  const shapeClip = clip.type === 'shape' ? (clip as IShapeClip) : null;
  const audioClip = clip.type === 'audio' ? (clip as IAudioClip) : null;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto p-4">
      {/* Basic Section */}
      <Section title="Basic">
        <InputField label="ID" value={clip.id} readOnly />
        <InputField
          label="Name"
          value={clip.name}
          onChange={(value) => updateClip({ name: value })}
        />
        <InputField label="Type" value={clip.type} readOnly />
        <ToggleField
          label="Enabled"
          checked={clip.enabled}
          onChange={(checked) => updateClip({ enabled: checked })}
        />
      </Section>

      {/* Timing Section */}
      <Section title="Timing">
        <NumberField
          label="Start"
          value={clip.startTime}
          onChange={(value) => updateClip({ startTime: value })}
          min={0}
          step={0.1}
        />
        <NumberField
          label="End"
          value={clip.endTime}
          onChange={(value) => updateClip({ endTime: value })}
          min={clip.startTime}
          step={0.1}
        />
      </Section>

      {/* Trim Section */}
      <Section title="Trim">
        <NumberField
          label="Start"
          value={clip.trimStart}
          onChange={(value) => updateClip({ trimStart: value })}
          min={0}
          step={0.1}
        />
        <NumberField
          label="End"
          value={clip.trimEnd}
          onChange={(value) => updateClip({ trimEnd: value })}
          min={0}
          step={0.1}
        />
      </Section>

      {/* Audio Volume Section */}
      {audioClip && (
        <Section title="Audio">
          <NumberField
            label="Volume"
            value={audioClip.volume}
            onChange={(value) => updateClip({ volume: value })}
            min={0}
            max={1}
            step={0.01}
            showRange
          />
        </Section>
      )}

      {/* Layer Section (for graphic clips) */}
      {graphicClip && (
        <Section title="Layer">
          <NumberField
            label="Z Index"
            value={graphicClip.zIndex}
            onChange={(value) => updateClip({ zIndex: value })}
            min={0}
            step={1}
          />
        </Section>
      )}

      {/* Transform Section (for graphic clips) */}
      {graphicClip && (
        <TransformsSection
          transforms={graphicClip.transforms}
          onChange={(path: JsonPath, value: JsonPrimitive) => {
            const newTransforms = updateTransformAtPath(
              graphicClip.transforms,
              path,
              value
            );
            updateClip({
              transforms: newTransforms as typeof graphicClip.transforms,
            });
          }}
          onBatchChange={(updates) => {
            updateClip({
              transforms: { ...graphicClip.transforms, ...updates },
            });
          }}
          isTextClip={clip.type === 'text'}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}

      {/* Text Properties Section */}
      {textClip && (
        <TextPropertiesSection
          textData={textClip.textData}
          onChange={(updates) =>
            updateClip({
              textData: { ...textClip.textData, ...updates },
            })
          }
        />
      )}

      {/* Shape Properties Section */}
      {shapeClip && (
        <ShapePropertiesSection
          shapeData={shapeClip.shapeData}
          onChange={(updatedShapeData) => {
            // shapeData의 width/height가 변경되면 transform.size도 함께 업데이트
            const sizeChanged =
              updatedShapeData.width !== shapeClip.shapeData.width ||
              updatedShapeData.height !== shapeClip.shapeData.height;

            updateClip({
              shapeData: updatedShapeData,
              ...(sizeChanged && {
                transforms: {
                  ...shapeClip.transforms,
                  size: {
                    width: updatedShapeData.width,
                    height: updatedShapeData.height,
                  },
                },
              }),
            });
          }}
        />
      )}

      {/* Effects Section (for all clips) */}
      <EffectsSection
        effects={clip.effects}
        onChange={(effects) => updateClip({ effects })}
      />
    </div>
  );
}
