import { useEffect, useState } from 'react';
import { useDocSettings, useEngineTimer } from '../hooks';

export function Timeline() {
  const settings = useDocSettings();
  const timer = useEngineTimer();
  const [currentMs, setCurrentMs] = useState(0);
  useEffect(() => {
    if (!timer) return;

    return timer.subscribe(({ currentMs }) => {
      setCurrentMs(currentMs);
    });
  }, [timer]);

  return (
    <div>
      <input
        className="w-full"
        type="range"
        value={currentMs}
        onChange={(e) => {
          const v = Number(e.target.value);
          timer?.seek(v);
        }}
        min={0}
        step={100}
        max={settings.duration}
      />
    </div>
  );
}
