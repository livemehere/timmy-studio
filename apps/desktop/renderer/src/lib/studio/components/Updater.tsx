import { useTimer } from '@renderer/lib/studio/hooks/useTimer';
import { useStudio } from '@renderer/lib/studio/contexts/StudioProvider';
import { useObservable } from '@renderer/lib/studio/hooks/useObservable';

export function Updater() {
  const studio = useStudio();
  const settings = useObservable(studio.settings$, studio.settings$.value);
  const { time, seek, play, pause, resume, reset } = useTimer();
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
          seek(Number(e.target.value));
        }}
      />
      <div>current time : {time} ms</div>
      <button onClick={play}>Play</button>
      <button onClick={pause}>Pause</button>
      <button onClick={resume}>Resume</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
