import { useSyncExternalStore } from 'react';
import { useStudio } from '../contexts/StudioProvider';
import { distinctUntilChanged, map } from 'rxjs';

export function useProjectSettings() {
  const studio = useStudio();
  return useSyncExternalStore(
    (cb) => {
      const subscription = studio.project$
        .pipe(
          map((project) => project.settings),
          distinctUntilChanged()
        )
        .subscribe(() => {
          cb();
          console.log('called');
        });
      return () => {
        subscription.unsubscribe();
      };
    },
    () => studio.project$.value.settings
  );
}
