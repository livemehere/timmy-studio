import { useDocStore, useEngineStore } from '../../hooks/useStudioStores';
import type {
  IClip,
  IGraphicClip,
  ITextClip,
  IShapeClip,
  IAudioClip,
} from '@/lib/studio/domains/Clip/types';
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
import { BasicProperty } from './BasicProperty';
import { RangeProperty } from './RangeProperty';
import { TrimProperty } from './TrimProperty';
import { VolumeProperty } from './VolumeProperty';
import { TransformProperty } from './TransformProperty';
import { TextProperty } from './TextProperty';
import { ShapeProperty } from './ShapeProperty';
import { EffectProperty } from './EffectProperty';

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
        Can't find Clip ID: {clipId}
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

  const handleTransformChange = (path: JsonPath, value: JsonPrimitive) => {
    if (!graphicClip) return;
    const newTransforms = updateTransformAtPath(
      graphicClip.transforms,
      path,
      value
    );
    updateClip({
      transforms: newTransforms as typeof graphicClip.transforms,
    });
  };

  const handleBatchTransformChange = (updates: any) => {
    if (!graphicClip) return;
    updateClip({
      transforms: { ...graphicClip.transforms, ...updates },
    });
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
        defaultValue={['basic', 'range', 'transform']}
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
            <BasicProperty
              name={clip.name}
              enabled={clip.enabled}
              onChangeName={(value) => {
                updateClip({ name: value });
              }}
              onChangeEnabled={(checked) => {
                updateClip({ enabled: checked });
              }}
              onChanged={() => {}}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="range" className="border-neutral-800">
          <AccordionTrigger className="py-2 text-xs">
            <span className="flex items-center gap-2">
              <Clock size={14} />
              Range
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-3">
            <RangeProperty
              startTime={clip.startTime}
              endTime={clip.endTime}
              onChangeStartTime={(value) => {
                updateClip({ startTime: value });
              }}
              onChangeEndTime={(value) => {
                updateClip({ endTime: value });
              }}
              onChanged={() => {}}
            />
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
            <TrimProperty
              trimStart={clip.trimStart}
              trimEnd={clip.trimEnd}
              onChangeTrimStart={(value) => {
                updateClip({ trimStart: value });
              }}
              onChangeTrimEnd={(value) => {
                updateClip({ trimEnd: value });
              }}
              onChanged={() => {}}
            />
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
              <VolumeProperty
                volume={audioClip.volume}
                onChangeVolume={(value) => {
                  updateClip({ volume: value });
                }}
                onChanged={() => {}}
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
              <TransformProperty
                transforms={graphicClip.transforms}
                onChange={handleTransformChange}
                onLiveChange={handleLiveTransformChange}
                onBatchChange={handleBatchTransformChange}
                isTextClip={clip.type === 'text'}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                onChanged={() => {}}
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
              <TextProperty
                textData={textClip.textData}
                onChange={(updates) => {
                  updateClip({
                    textData: { ...textClip.textData, ...updates },
                  });
                }}
                onChanged={() => {}}
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
              <ShapeProperty
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
                onChanged={() => {}}
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
            <EffectProperty
              effects={clip.effects}
              onChange={(effects) => updateClip({ effects })}
              onChanged={() => {}}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
