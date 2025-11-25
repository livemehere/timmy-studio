import { useEngineTimer } from '@renderer/lib/studio/hooks';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatTime } from '../utils/time';

export function TimerActionBar() {
  const timer = useEngineTimer();
  const [timerState, setTimerState] = useState({
    currentMs: 0,
    isPlaying: false,
    durationMs: 0,
  });

  // Timer 상태 구독 (고주파 업데이트)
  useEffect(() => {
    if (!timer) return;

    return timer.subscribe(setTimerState);
  }, [timer]);

  const handlePlay = () => {
    if (!timer) return;
    if (timerState.isPlaying) {
      timer.pause();
    } else {
      timer.play();
    }
  };

  return (
    <div className={'h-[26px] flex items-center justify-between'}>
      <div className="tabular-nums">
        {formatTime(timerState.currentMs)} / {formatTime(timerState.durationMs)}
      </div>
      <button onClick={handlePlay}>
        {timerState.isPlaying ? (
          <PauseIcon size={16} />
        ) : (
          <PlayIcon size={16} />
        )}
      </button>
      <div></div>
    </div>
  );
}
