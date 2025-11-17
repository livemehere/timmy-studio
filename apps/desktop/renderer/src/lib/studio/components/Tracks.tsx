import { useStudio } from '@renderer/lib/studio/contexts/StudioProvider';
import { useObservable } from '@renderer/lib/studio/hooks/useObservable';

function Track({}: { track: Track }) {
  return <div></div>;
}

export function Tracks() {
  const studio = useStudio();
  const tracks = useObservable(studio.tracks$, studio.tracks$.value);
  console.log(tracks);
  return (
    <div>
      {tracks.map((track) => {
        return <div key={track.id}>{track.name}</div>;
      })}
    </div>
  );
}
