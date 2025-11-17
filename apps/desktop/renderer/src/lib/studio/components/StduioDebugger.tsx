import { useStudio } from '@renderer/lib/studio/contexts/StudioProvider';
import { useObservable } from '@renderer/lib/studio/hooks/useObservable';

export function StudioDebugger() {
  const studio = useStudio();
  const settings = useObservable(studio.settings$, studio.settings$.value);

  return (
    <div
      className={
        'fixed top-30 left-10 z-10 bg-black/80 p-2 shadow-xl shadow-white/20'
      }
    >
      <pre className="text-xs text-white max-h-[80vh] overflow-auto">
        {JSON.stringify(settings, null, 2)}
      </pre>
    </div>
  );
}
