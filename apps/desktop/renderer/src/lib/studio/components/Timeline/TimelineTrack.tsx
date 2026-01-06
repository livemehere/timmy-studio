import * as react from 'react';
import {
  Ellipsis,
  Eye,
  LockKeyhole,
  type LucideProps,
  VolumeOff,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TimelineClip } from '@renderer/lib/studio/components/Timeline/TimelineClip';
import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';

function TrackButton({
  icon: IconComp,
  active,
  onClick,
}: {
  icon: react.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & react.RefAttributes<SVGSVGElement>
  >;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn('hover:bg-neutral-700 p-1 rounded')}
      onClick={onClick}
    >
      <IconComp size={14} color={active ? 'dodgerblue' : undefined} />
    </button>
  );
}

export function TimelineTrack({
  trackId,
  trackTitleWidth,
  trackHeight,
  pxPerSec,
}: {
  trackId: string;
  trackTitleWidth: number;
  trackHeight: number;
  pxPerSec: number;
}) {
  const getTrackById = useDocStore((state) => state.getTrackById);
  const updateTrack = useDocStore((state) => state.updateTrack);
  const track = getTrackById(trackId);

  const draggingClipId = useInteractionStore((state) => state.draggingClipId);
  const hoverTrackId = useInteractionStore((state) => state.hoverTrackId);

  const isHovering = draggingClipId && hoverTrackId === trackId;

  if (!track) {
    throw new Error(`Track(${trackId}) not found`);
  }

  const toggleTrackLock = (trackId: string, locked: boolean) => {
    updateTrack(trackId, { locked });
  };

  return (
    <div
      style={{
        height: trackHeight,
      }}
      className={'bg-neutral-850 flex'}
    >
      <div
        className={
          'sticky left-0 z-50 bg-neutral-800 shrink-0 flex items-center justify-between gap-1.5 px-2'
        }
        style={{ width: trackTitleWidth }}
      >
        <div className="flex items-center gap-1.5">
          <TrackButton
            icon={LockKeyhole}
            active={track.locked}
            onClick={() => toggleTrackLock(track.id, !track.locked)}
          />
          <TrackButton icon={Eye} />
          <TrackButton icon={VolumeOff} />
          <TrackButton icon={Ellipsis} />
        </div>
        <span className="text-xs text-neutral-400 font-mono pointer-events-none relative">
          z:{track.zIndex}
        </span>
      </div>

      <div
        className={cn('bg-neutral-800 flex-1 relative transition-colors', {
          'bg-cyan-900/30': isHovering,
        })}
      >
        {track.clips.map((clip) => (
          <TimelineClip
            key={clip.id}
            trackId={track.id}
            clipId={clip.id}
            pxPerSec={pxPerSec}
            trackHeight={trackHeight}
          />
        ))}
      </div>
    </div>
  );
}
