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

  // zIndex 기반으로 내림차순 정렬 (높은 zIndex가 위에)
  const sortedTracks = [...tracks].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div
      style={{
        width,
        height,
      }}
    >
      {sortedTracks.map((track) => (
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
