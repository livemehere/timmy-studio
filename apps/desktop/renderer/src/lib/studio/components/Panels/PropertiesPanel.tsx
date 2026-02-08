import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Empty } from '../Properties/Empty';
import { Properties } from '../Properties/Properties';
import { useInteractionStore, useDocStore } from '../../hooks/useStudioStores';
import { GradientScroll } from '@/components/GradientScroll';
import { Track } from '../../domains/Track/Track';

export function PropertiesPanel() {
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);
  const [activeClipIndex, setActiveClipIndex] = useState(0);

  if (selectedClipIds.length === 0) {
    return <Empty />;
  }

  const activeClipId = selectedClipIds[activeClipIndex];

  return (
    <div className="h-full flex flex-col select-none">
      <GradientScroll className="px-3 py-2">
        <ToggleGroup
          type="single"
          value={String(activeClipIndex)}
          onValueChange={(v) => v && setActiveClipIndex(Number(v))}
        >
          {selectedClipIds.map((clipId, i) => (
            <ToggleGroupItem
              key={clipId}
              value={String(i)}
              size="lg"
              className="text-xs data-[state=off]:text-neutral-400"
            >
              <ClipNameTab clipId={clipId} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </GradientScroll>

      <div className="flex-1 min-h-0">
        {activeClipId && <Properties clipId={activeClipId} />}
      </div>
    </div>
  );
}

function ClipNameTab({ clipId }: { clipId: string }) {
  const tracks = useDocStore((state) => state.tracks);
  const result = Track.findClip(tracks, clipId);

  if (!result) {
    return <span className="text-neutral-500">Unknown</span>;
  }

  return <span className="truncate max-w-20">{result.clip.name}</span>;
}
