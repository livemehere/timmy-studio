import { useDocStore } from '@renderer/lib/studio/contexts/StudioProvider';
import { Track } from '@renderer/lib/studio/components/Track/Track';

export function Tracks() {
  const tracks = useDocStore((state) => state.tracks);
  return (
    <div>
      {tracks.map((track) => (
        <Track key={track.id} trackId={track.id} />
      ))}
    </div>
  );
}
