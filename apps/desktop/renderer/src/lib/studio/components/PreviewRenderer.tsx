import { useSyncExternalStore } from 'react';
import { useStudio } from '../StudioProvider';

export function PreviewRenderer() {
  const settings = useProjectSettings();
  console.log('preview render');

  return (
    <div>
      <div>settings.width: {settings.width}</div>
      <div>settings.height: {settings.height}</div>
    </div>
  );
}

function useProjectSettings() {
  const studio = useStudio();
  return useSyncExternalStore(
    (cb) => {
      const subscription = studio.project$.subscribe(cb);
      return () => {
        subscription.unsubscribe();
      };
    },
    () => studio.project$.value.settings
  );
}
