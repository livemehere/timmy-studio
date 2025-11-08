import { useProjectSettings } from '@renderer/lib/studio/hooks/useProjectSettings';
import { useEffect } from 'react';
import { useCurrentTime } from '@renderer/lib/studio/hooks/useCurrentTime';

export function Updater() {
  const settings = useProjectSettings();
  useEffect(() => {
    console.log('[Updater] RENDER');
  });

  const [time, setTime] = useCurrentTime();

  return (
    <div>
      <input
        className="w-full p-2"
        type="range"
        min={0}
        max={settings.duration}
        step={100}
        value={time}
        onChange={(e) => {
          setTime(Number(e.target.value));
        }}
      />
      <div>current time : {time} ms</div>
    </div>
  );
}
