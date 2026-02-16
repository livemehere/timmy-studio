import * as react from 'react';
import { cn } from '@/lib/utils';
import { TimelineClip } from '@/lib/studio/domains/Timeline/TimelineClip';
import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import { TrackHeader } from './TrackHeader';
import { useRef } from 'react';

export function TimelineTrack({
  trackId,
  headerWidth,
  trackHeight,
  pxPerSec,
}: {
  trackId: string;
  headerWidth: number;
  trackHeight: number;
  pxPerSec: number;
}) {
  const trackContentRef = useRef<HTMLDivElement>(null);

  const getTrackById = useDocStore((state) => state.getTrackById);
  const track = getTrackById(trackId);

  if (!track) {
    throw new Error(`Track(${trackId}) not found`);
  }

  /** active track */
  const activeTrackId = useInteractionStore((state) => state.activeTrackId);
  const setActiveTrackId = useInteractionStore(
    (state) => state.setActiveTrackId
  );
  const isActive = activeTrackId === trackId;
  const activeTrack = activeTrackId ? getTrackById(activeTrackId) : undefined;
  const activeTrackType = activeTrack?.type;
  const isSameTrackType = activeTrackType === track.type;

  /** last clicked time */
  const setLastClickedTime = useInteractionStore(
    (state) => state.setLastClickedTime
  );
  const saveLastClickedTime = (e: react.PointerEvent<HTMLDivElement>) => {
    const trackEl = trackContentRef.current;
    if (!trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.x;
    const timeAtMouseSec = mouseX / pxPerSec;
    const timeAtMouseMs = timeAtMouseSec * 1000;
    setLastClickedTime(timeAtMouseMs);
  };

  /** dragging clip */
  const draggingClipId = useInteractionStore((state) => state.draggingClipId);
  const isDroppable = !!draggingClipId && isSameTrackType;
  const isNotDroppable = !!draggingClipId && !isSameTrackType;

  return (
    <div
      style={{
        height: trackHeight,
      }}
      className="flex"
      onPointerDown={(e) => {
        setActiveTrackId(trackId);
        saveLastClickedTime(e);
      }}
    >
      <TrackHeader trackId={trackId} headerWidth={headerWidth} />
      <div
        ref={trackContentRef}
        className={cn('bg-neutral-800/50 flex-1 relative transition-colors', {
          'bg-blue-900/10': isDroppable,
          'bg-rose-900/10': isNotDroppable,
          'bg-white/10': isActive,
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
