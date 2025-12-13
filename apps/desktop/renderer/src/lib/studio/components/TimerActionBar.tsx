import { useEngineStore } from '../hooks/useStudioStores';
import { PauseIcon, PlayIcon, HardDriveUploadIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatTime } from '../utils/time';

export function TimerActionBar() {
  const timer = useEngineStore((state) => state.timer);
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

  const handleExport = async () => {
    // 1. timer 를 0으로 설정
    // 2.
  };

  return (
    <div className={'grid grid-cols-3 items-center p-2'}>
      <div className="tabular-nums">
        {formatTime(timerState.currentMs)} / {formatTime(timerState.durationMs)}
      </div>
      <div className="flex justify-center">
        <button onClick={handlePlay}>
          {timerState.isPlaying ? (
            <PauseIcon size={16} />
          ) : (
            <PlayIcon size={16} />
          )}
        </button>
      </div>
      <div className="flex justify-end">
        <button
          className="flex items-center gap-2 bg-neutral-700 rounded px-2 py-0.5 hover:bg-neutral-600 cursor-pointer"
          onClick={handleExport}
        >
          <HardDriveUploadIcon size={16} />
          <span>내보내기</span>
        </button>
      </div>
    </div>
  );
}
