import { useDocStore } from '../../hooks/useStudioStores';
import { TimelineTrack } from '@/lib/studio/domains/Timeline/TimelineTrack';
import { ExportRangeOverlay } from './ExportRangeOverlay';
import { useRef } from 'react';
import { ClipSelection } from './ClipSelection';

export function TimelineTracks({
  width,
  trackHeaderWidth,
  trackHeight,
  pxPerSec,
}: {
  width: number;
  trackHeaderWidth: number;
  trackHeight: number;
  pxPerSec: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tracks = useDocStore((state) => state.tracks);

  return (
    <div
      id="timeline-tracks"
      ref={ref}
      className="relative"
      style={{
        width,
      }}
    >
      {/* Export Range Overlay */}
      <ExportRangeOverlay pxPerSec={pxPerSec} />
      <ClipSelection containerRef={ref} />

      {tracks.map((track) => (
        <TimelineTrack
          key={track.id}
          trackId={track.id}
          headerWidth={trackHeaderWidth}
          trackHeight={trackHeight}
          pxPerSec={pxPerSec}
        />
      ))}
    </div>
  );
}
