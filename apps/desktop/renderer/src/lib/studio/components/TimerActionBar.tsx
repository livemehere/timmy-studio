import { useEngineStore } from '@renderer/lib/studio/contexts/StudioProvider';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { useState, useEffect } from 'react';

export function TimerActionBar() {
  const timer = useEngineStore((state) => state.timer);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [duration, setDuration] = useState(0);

  // Timer 상태 구독 (고주파 업데이트)
  useEffect(() => {
    if (!timer) return;

    const unsubscribeIsPlaying = timer.isPlaying$.subscribe(setIsPlaying);
    const unsubscribeCurrentMs = timer.currentMs$.subscribe(setCurrentMs);
    const unsubscribeDuration = timer.durationMs$.subscribe(setDuration);

    return () => {
      unsubscribeIsPlaying.unsubscribe();
      unsubscribeCurrentMs.unsubscribe();
      unsubscribeDuration.unsubscribe();
    };
  }, [timer]);

  const handlePlay = () => {
    if (!timer) return;
    if (isPlaying) {
      timer.pause();
    } else {
      timer.play();
    }
  };

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
