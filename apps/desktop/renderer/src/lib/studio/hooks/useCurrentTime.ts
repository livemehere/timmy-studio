import { useStudio } from '@renderer/lib/studio/contexts/StudioProvider';
import { useSyncExternalStore } from 'react';

export function useCurrentTime() {
  const studio = useStudio();
  const time = useSyncExternalStore(
    (cb) => {
      const subscription = studio.currentTime$.subscribe(cb);
      return () => {
        subscription.unsubscribe();
      };
    },
    () => studio.currentTime$.value
  );

  const setTime = (newTime: number) => {
    studio.currentTime$.next(newTime);
  };

  return [time, setTime] as const;
}
