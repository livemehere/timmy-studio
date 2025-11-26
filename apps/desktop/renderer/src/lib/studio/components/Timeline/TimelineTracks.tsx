import { useDocTracks } from '@renderer/lib/studio/hooks';
import { TimelineTrack } from '@renderer/lib/studio/components/Timeline/TimelineTrack';

export function TimelineTracks({
  width,
  height,
  trackTitleWidth,
  trackHeight,
}: {
  width: number;
  height: number;
  trackTitleWidth: number;
  trackHeight: number;
}) {
  const tracks = useDocTracks();
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
        />
      ))}
    </div>
  );
}
