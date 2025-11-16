import { useSyncExternalStore } from 'react';
import { useStudio } from '../contexts/StudioProvider';

export function useProjectSettings() {
  const studio = useStudio();
  return useSyncExternalStore(
    (cb) => studio.subscribeSettings(cb),
    () => studio.settings
  );
}
