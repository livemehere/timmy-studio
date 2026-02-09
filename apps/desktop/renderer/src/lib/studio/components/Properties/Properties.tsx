import { useDocStore } from '../../hooks/useStudioStores';
import type {
  IClip,
  IGraphicClip,
  ITextClip,
  IShapeClip,
  IAudioClip,
} from '@/lib/studio/domains/Clip/types';
import { Track } from '../../domains/Track/Track';
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
  type LucideIcon,
} from 'lucide-react';
import { BasicProperty } from './BasicProperty';
import { RangeProperty } from './RangeProperty';
import { TrimProperty } from './TrimProperty';
import { VolumeProperty } from './VolumeProperty';
import { TransformProperty } from './TransformProperty';
import { TextProperty } from './TextProperty';
import { ShapeProperty } from './ShapeProperty';
import { EffectProperty } from './EffectProperty';
import { toast } from 'sonner';
import {
  updateTransformAtPath,
  type JsonPath,
  type JsonPrimitive,
} from '../../utils/transformHelpers';

interface PropertiesProps {
  clipId: string;
}

export function Properties({ clipId }: PropertiesProps) {
  const tracks = useDocStore((state) => state.tracks);
  const settings = useDocStore((state) => state.settings);
  const updateClipInTrack = useDocStore((state) => state.updateClip);

  const result = Track.findClip(tracks, clipId);
  if (!result) {
    throw new Error('Clip not found');
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
  const durationMs = settings.duration;

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
    <div className="flex flex-col h-full overflow-y-auto">
      <BaseClipInfo clip={clip} />

      <Accordion
        type="multiple"
        defaultValue={['range']}
        className="w-full space-y-1"
      >
        <PropertyItem
          value="basic"
          name="Basic"
          icon={Settings2}
          content={
            <BasicProperty
              defaultName={clip.name}
              defaultEnabled={clip.enabled}
              onCommitName={(value) => {
                updateClip({ name: value });
              }}
              onCommitEnabled={(checked) => {
                updateClip({ enabled: checked });
              }}
            />
          }
        />

        <PropertyItem
          value="range"
          name="Range"
          icon={Clock}
          content={
            <RangeProperty
              durationMs={durationMs}
              defaultStartTime={clip.startTime}
              defaultEndTime={clip.endTime}
              onCommitStartTime={(value) => {
                updateClip({ startTime: value });
              }}
              onCommitEndTime={(value) => {
                updateClip({ endTime: value });
              }}
              onLiveStartTimeChange={(v) => {
                // TODO: preview 업데이트
                // TODO: clip 을 포퍼먼스 이슈 없이 tranlsate 처리할 방법 고안 (motionValue or dom ref 잡아서 zustand 공유) - insteractionStore 활용
              }}
              onLiveEndTimeChange={(v) => {
                // TODO: 위와 동일
              }}
            />
          }
        />

        <PropertyItem
          value="trim"
          name="Trim"
          icon={Scissors}
          content={
            <TrimProperty
              trimStart={clip.trimStart}
              trimEnd={clip.trimEnd}
              maxTrimMs={Math.max(0, clip.endTime - clip.startTime)}
              onChangeTrimStart={(value) => {
                updateClip({ trimStart: value });
              }}
              onChangeTrimEnd={(value) => {
                updateClip({ trimEnd: value });
              }}
              onChanged={() => {}}
            />
          }
        />

        {audioClip && (
          <PropertyItem
            value="audio"
            name="Audio"
            icon={Volume2}
            content={
              <VolumeProperty
                volume={audioClip.volume}
                onChangeVolume={(value) => {
                  updateClip({ volume: value });
                }}
                onChanged={() => {}}
              />
            }
          />
        )}

        {graphicClip && (
          <PropertyItem
            value="transform"
            name="Transform"
            icon={Move3D}
            content={
              <TransformProperty
                transforms={graphicClip.transforms}
                onChange={handleTransformChange}
                onBatchChange={handleBatchTransformChange}
                isTextClip={clip.type === 'text'}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
              />
            }
          />
        )}

        {textClip && (
          <PropertyItem
            value="text"
            name="Text Properties"
            icon={Type}
            content={
              <TextProperty
                textData={textClip.textData}
                onChange={(updates) => {
                  updateClip({
                    textData: { ...textClip.textData, ...updates },
                  });
                }}
                onChanged={() => {}}
              />
            }
          />
        )}

        {shapeClip && (
          <PropertyItem
            value="shape"
            name="Shape Properties"
            icon={Hexagon}
            content={
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
            }
          />
        )}

        <PropertyItem
          value="effects"
          name="Effects"
          icon={Sparkles}
          badge={
            clip.effects &&
            clip.effects.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">
                {clip.effects.length}
              </Badge>
            )
          }
          content={
            <EffectProperty
              effects={clip.effects}
              onChange={(effects) => updateClip({ effects })}
              onChanged={() => {}}
            />
          }
        />
      </Accordion>
    </div>
  );
}

function BaseClipInfo({ clip }: { clip: IClip }) {
  return (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800 p-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {clip.type}
        </Badge>
        <span className="flex-1 text-sm font-medium text-neutral-200 truncate">
          {clip.name}
        </span>
      </div>
      {import.meta.env.DEV && (
        <div
          className="text-[10px] text-neutral-500 font-mono shrink-0 hover:bg-neutral-800 cursor-pointer px-1 rounded"
          onClick={() => {
            navigator.clipboard.writeText(clip.id);
            toast.success(`copied ${clip.id}`);
          }}
        >
          {clip.id}
        </div>
      )}
    </div>
  );
}

function PropertyItem({
  value,
  name,
  icon: LucideIcon,
  content,
  badge,
}: {
  value: string;
  name: string;
  icon: LucideIcon;
  content: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border-neutral-800">
      <AccordionTrigger className="p-2 pb-3 text-xs">
        <span className="flex items-center gap-2 text-neutral-400">
          <LucideIcon size={14} />
          {name}
          {badge}
        </span>
      </AccordionTrigger>
      <AccordionContent className="pt-2 pb-3 px-2">{content}</AccordionContent>
    </AccordionItem>
  );
}
