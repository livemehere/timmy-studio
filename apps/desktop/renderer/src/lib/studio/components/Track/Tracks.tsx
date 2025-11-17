import { useStudio } from '@renderer/lib/studio/contexts/StudioProvider';
import { useObservable } from '@renderer/lib/studio/hooks/useObservable';
import { Track } from '@renderer/lib/studio/components/Track/Track';

export function Tracks() {
  const studio = useStudio();
  const tracks = useObservable(studio.tracks$, studio.tracks$.value);
  return (
    <div>
      {tracks.map((track) => (
        <Track key={track.id} track={track} />
      ))}
    </div>
  );
}
