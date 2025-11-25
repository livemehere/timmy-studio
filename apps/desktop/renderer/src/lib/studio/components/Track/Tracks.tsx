import { useDocTracks } from '@renderer/lib/studio/hooks';
import { Track } from '@renderer/lib/studio/components/Track/Track';

export function Tracks() {
  const tracks = useDocTracks();
  return (
    <div>
      {tracks.map((track) => (
        <Track key={track.id} trackId={track.id} />
      ))}
    </div>
  );
}
