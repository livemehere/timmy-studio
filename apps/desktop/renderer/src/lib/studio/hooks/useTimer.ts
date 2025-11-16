import { useStudio } from '@renderer/lib/studio/contexts/StudioProvider';
import { useSyncExternalStore } from 'react';

export function useTimer() {
  const studio = useStudio();
  const time = useSyncExternalStore(
    (cb) => {
      return studio.timer.subscribe(cb);
    },
    () => studio.timer.currentMs
  );

  const isPlaying = useSyncExternalStore(
    (cb) => {
      return studio.timer.subscribe(() => cb());
    },
    () => studio.timer.isPlaying
  );

  return {
    time,
    isPlaying,
    play: () => studio.timer.play(),
    pause: () => studio.timer.pause(),
    resume: () => studio.timer.resume(),
    seek: (ms: number) => studio.timer.seek(ms),
    reset: () => studio.timer.reset(),
  };
}
