import { useDocTracks } from '@renderer/lib/studio/hooks';
import { TimelineTrack } from '@renderer/lib/studio/components/Timeline/TimelineTrack';

export function TimelineTracks({
  width,
  height,
}: {
  width: number;
  height: number;
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
        <TimelineTrack key={track.id} trackId={track.id} />
      ))}
    </div>
  );
}
