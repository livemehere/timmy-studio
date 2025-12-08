import { useDocStore } from '../../hooks/useStudioStores';
import { TimelineTrack } from '@renderer/lib/studio/components/Timeline/TimelineTrack';

export function TimelineTracks({
  width,
  height,
  trackTitleWidth,
  trackHeight,
  pxPerSec,
}: {
  width: number;
  height: number;
  trackTitleWidth: number;
  trackHeight: number;
  pxPerSec: number;
}) {
  const tracks = useDocStore((state) => state.tracks);
  return (
    <div
      style={{
        width,
        height,
      }}
    >
      {tracks.map((track) => (
        <TimelineTrack
          key={track.id}
          trackId={track.id}
          trackTitleWidth={trackTitleWidth}
          trackHeight={trackHeight}
          pxPerSec={pxPerSec}
        />
      ))}
    </div>
  );
}
