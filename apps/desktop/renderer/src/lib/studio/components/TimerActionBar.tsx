import { useStudio } from '@renderer/lib/studio/contexts/StudioProvider';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { useObservable } from '@renderer/lib/studio/hooks/useObservable';

export function TimerActionBar() {
  const studio = useStudio();

  const isPlaying = useObservable(
    studio.timer.isPlaying$,
    studio.timer.isPlaying
  );

  const handlePlay = () => {
    if (studio.timer.isPlaying) {
      studio.timer.pause();
    } else {
      studio.timer.play();
    }
  };

  const currentMs = useObservable(
    studio.timer.currentMs$,
    studio.timer.currentMs
  );

  const duration = useObservable(
    studio.timer.durationMs$,
    studio.timer.durationMs
  );

  return (
    <div className={'h-[26px] flex items-center justify-between'}>
      <div>
        {Math.floor(currentMs / 1000)}s / {Math.floor(duration / 1000)}s
      </div>
      <button onClick={handlePlay}>
        {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
      </button>
      <div></div>
    </div>
  );
}
