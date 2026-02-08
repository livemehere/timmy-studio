import { useDocStore, useEngineStore } from '../../hooks/useStudioStores';
import type {
  IClip,
  IGraphicClip,
  ITextClip,
  IShapeClip,
  IAudioClip,
} from '@/lib/studio/domains/Clip/types';
import { InputField, NumberField, ToggleField } from '../inputs';
import { TransformsSection } from '../Properties/TransformsSection';
import { TextPropertiesSection } from '../Properties/TextPropertiesSection';
import { ShapePropertiesSection } from '../Properties/ShapePropertiesSection';
import { EffectsSection } from '../Properties/EffectsSection';
import {
  updateTransformAtPath,
  type JsonPath,
  type JsonPrimitive,
} from '../../utils/transformHelpers';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Settings2,
  Clock,
  Scissors,
  Move3D,
  Type,
  Hexagon,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useRef } from 'react';
import { Track } from '../../domains/Track/Track';

interface PropertiesProps {
  clipId: string;
}

export function Properties({ clipId }: PropertiesProps) {
  const tracks = useDocStore((state) => state.tracks);
  const updateClipInTrack = useDocStore((state) => state.updateClip);
  const settings = useDocStore((state) => state.settings);
  const renderer = useEngineStore((state) => state.renderer);

  const liveTransformsRef = useRef<IGraphicClip['transforms'] | null>(null);

  const result = Track.findClip(tracks, clipId);
  if (!result) {
    return (
      <div className="h-full flex flex-col gap-3 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const { clip, trackId } = result;
  const canvasWidth = settings.width;
  const canvasHeight = settings.height;

  const updateClip = (updates: Partial<IClip>) => {
    liveTransformsRef.current = null;
    updateClipInTrack(trackId, clip.id, updates);
  };

  const isGraphicClip = clip.type !== 'audio';
  const graphicClip = isGraphicClip ? (clip as IGraphicClip) : null;
  const textClip = clip.type === 'text' ? (clip as ITextClip) : null;
  const shapeClip = clip.type === 'shape' ? (clip as IShapeClip) : null;
  const audioClip = clip.type === 'audio' ? (clip as IAudioClip) : null;

  const handleLiveTransformChange = (path: JsonPath, value: JsonPrimitive) => {
    if (!renderer || !graphicClip) return;

    const graphicTrack = renderer.tracks.get(trackId);
    if (!graphicTrack) return;

    const clipInstance = graphicTrack.clips.get(clip.id);
    if (!clipInstance) return;

    if (!liveTransformsRef.current) {
      liveTransformsRef.current = JSON.parse(
        JSON.stringify(graphicClip.transforms)
      );
    }

    const newTransforms = updateTransformAtPath(
      liveTransformsRef.current,
      path,
      value
    );
    liveTransformsRef.current = newTransforms as IGraphicClip['transforms'];

    clipInstance.applyTransform(liveTransformsRef.current);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-200 truncate max-w-[120px]">
            {clip.name}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {clip.type}
          </Badge>
        </div>
        <div className="text-[10px] text-neutral-500 font-mono">
          {clip.id.slice(0, 8)}
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={['basic', 'timing', 'transform']}
        className="w-full space-y-1"
      >
        <AccordionItem value="basic" className="border-neutral-800">
          <AccordionTrigger className="py-2 text-xs">
            <span className="flex items-center gap-2">
              <Settings2 size={14} />
              Basic
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-3">
            <div className="space-y-2">
              <InputField
                label="Name"
                value={clip.name}
                onChange={(value) => updateClip({ name: value })}
              />
              <ToggleField
                label="Enabled"
                checked={clip.enabled}
                onChange={(checked) => updateClip({ enabled: checked })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="timing" className="border-neutral-800">
          <AccordionTrigger className="py-2 text-xs">
            <span className="flex items-center gap-2">
              <Clock size={14} />
              Timing
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-3">
            <div className="space-y-2">
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
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="trim" className="border-neutral-800">
          <AccordionTrigger className="py-2 text-xs">
            <span className="flex items-center gap-2">
              <Scissors size={14} />
              Trim
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-3">
            <div className="space-y-2">
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
            </div>
          </AccordionContent>
        </AccordionItem>

        {audioClip && (
          <AccordionItem value="audio" className="border-neutral-800">
            <AccordionTrigger className="py-2 text-xs">
              <span className="flex items-center gap-2">
                <Volume2 size={14} />
                Audio
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3">
              <NumberField
                label="Volume"
                value={audioClip.volume}
                onChange={(value) => updateClip({ volume: value })}
                min={0}
                max={1}
                step={0.01}
                showRange
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {graphicClip && (
          <AccordionItem value="transform" className="border-neutral-800">
            <AccordionTrigger className="py-2 text-xs">
              <span className="flex items-center gap-2">
                <Move3D size={14} />
                Transform
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3">
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
                onLiveChange={handleLiveTransformChange}
                onBatchChange={(updates) => {
                  updateClip({
                    transforms: { ...graphicClip.transforms, ...updates },
                  });
                }}
                isTextClip={clip.type === 'text'}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {textClip && (
          <AccordionItem value="text" className="border-neutral-800">
            <AccordionTrigger className="py-2 text-xs">
              <span className="flex items-center gap-2">
                <Type size={14} />
                Text Properties
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3">
              <TextPropertiesSection
                textData={textClip.textData}
                onChange={(updates) =>
                  updateClip({
                    textData: { ...textClip.textData, ...updates },
                  })
                }
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {shapeClip && (
          <AccordionItem value="shape" className="border-neutral-800">
            <AccordionTrigger className="py-2 text-xs">
              <span className="flex items-center gap-2">
                <Hexagon size={14} />
                Shape Properties
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3">
              <ShapePropertiesSection
                shapeData={shapeClip.shapeData}
                onChange={(updatedShapeData) => {
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
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="effects" className="border-neutral-800">
          <AccordionTrigger className="py-2 text-xs">
            <span className="flex items-center gap-2">
              <Sparkles size={14} />
              Effects
              {clip.effects && clip.effects.length > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {clip.effects.length}
                </Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-3">
            <EffectsSection
              effects={clip.effects}
              onChange={(effects) => updateClip({ effects })}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
