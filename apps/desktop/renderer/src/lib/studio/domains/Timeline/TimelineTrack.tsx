import * as react from 'react';
import { cn } from '@/lib/utils';
import { TimelineClip } from '@/lib/studio/domains/Timeline/TimelineClip';
import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import { TrackHeader } from './TrackHeader';

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
  const getTrackById = useDocStore((state) => state.getTrackById);
  const track = getTrackById(trackId);
  const activeTrackId = useDocStore((state) => state.activeTrackId);
  const setActiveTrackId = useDocStore((state) => state.setActiveTrackId);

  const draggingClipId = useInteractionStore((state) => state.draggingClipId);
  const hoverTrackId = useInteractionStore((state) => state.hoverTrackId);
  const setLastClickedTime = useInteractionStore(
    (state) => state.setLastClickedTime
  );

  const trackContentRef = react.useRef<HTMLDivElement>(null);

  const isHovering = draggingClipId && hoverTrackId === trackId;

  if (!track) {
    throw new Error(`Track(${trackId}) not found`);
  }

  const handlePointerDown = () => {
    setActiveTrackId(trackId);
  };

  const handleClick = (e: react.MouseEvent) => {
    if (!trackContentRef.current) return;

    const rect = trackContentRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const timeAtMouseSec = mouseX / pxPerSec;
    const timeAtMouseMs = timeAtMouseSec * 1000; // Convert to milliseconds

    console.log('[TimelineTrack] Clicked at time:', timeAtMouseMs);
    setLastClickedTime(timeAtMouseMs);
  };

  const isActive = activeTrackId === trackId;

  return (
    <div
      style={{
        height: trackHeight,
      }}
      className="bg-neutral-850 flex "
      onPointerDown={handlePointerDown}
    >
      <TrackHeader trackId={trackId} headerWidth={headerWidth} />
      <div
        ref={trackContentRef}
        className={cn('bg-neutral-800/50 flex-1 relative transition-colors', {
          'bg-cyan-900/20 ring-1 ring-inset ring-cyan-500/30': isHovering,
          'bg-blue-950/20': isActive,
        })}
        onClick={handleClick}
      >
        {/* Track Grid Pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: `${pxPerSec}px 100%`,
          }}
        />
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
