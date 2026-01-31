import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import type {
  IClip,
  IGraphicClip,
  ITextClip,
  IShapeClip,
  IAudioClip,
} from '@/lib/studio/domains/Clip/types';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

export function PropertiesPanel() {
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);
  const tracks = useDocStore((state) => state.tracks);
  const updateClipInTrack = useDocStore((state) => state.updateClip);
  const settings = useDocStore((state) => state.settings);

  const selectedClipId = selectedClipIds[0];
  if (!selectedClipId) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-4 text-neutral-500">
        <Settings2 size={32} className="opacity-30" />
        <span className="text-sm">Select a clip to edit properties</span>
      </div>
    );
  }

  const result = findClipInTracks(tracks, selectedClipId);
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
    updateClipInTrack(trackId, clip.id, updates);
  };

  const isGraphicClip = clip.type !== 'audio';
  const graphicClip = isGraphicClip ? (clip as IGraphicClip) : null;
  const textClip = clip.type === 'text' ? (clip as ITextClip) : null;
  const shapeClip = clip.type === 'shape' ? (clip as IShapeClip) : null;
  const audioClip = clip.type === 'audio' ? (clip as IAudioClip) : null;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full overflow-y-auto p-3">
        {/* Header with clip info */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-200 truncate max-w-[120px]">
              {clip.name}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {clip.type}
            </Badge>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-[10px] text-neutral-500 font-mono cursor-help">
                {clip.id.slice(0, 8)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-mono text-xs">{clip.id}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Accordion
          type="multiple"
          defaultValue={['basic', 'timing', 'transform']}
          className="w-full space-y-1"
        >
          {/* Basic Section */}
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

          {/* Timing Section */}
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

          {/* Trim Section */}
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

          {/* Audio Volume Section */}
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

          {/* Transform Section (for graphic clips) */}
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
                      transforms:
                        newTransforms as typeof graphicClip.transforms,
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
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Text Properties Section */}
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

          {/* Shape Properties Section */}
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

          {/* Effects Section */}
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
    </TooltipProvider>
  );
}
