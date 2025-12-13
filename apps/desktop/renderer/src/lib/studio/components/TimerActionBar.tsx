import { useDocStore, useEngineStore } from '../hooks/useStudioStores';
import { PauseIcon, PlayIcon, HardDriveUploadIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { formatTime } from '../utils/time';

export function TimerActionBar() {
  const timer = useEngineStore((state) => state.timer);
  const settings = useDocStore((state) => state.settings);
  const renderer = useEngineStore((state) => state.renderer);
  const exportGridRef = useRef<HTMLDivElement | null>(null);
  const [exportState, setExportState] = useState<{
    isExporting: boolean;
    writtenFrames: number;
    totalFrames: number;
    percent: number;
    outputPath: string;
    error: string | null;
  }>({
    isExporting: false,
    writtenFrames: 0,
    totalFrames: 0,
    percent: 0,
    outputPath: '',
    error: null,
  });
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
    if (!timer || !renderer) return;

    const prevMode = renderer.getSeekingRenderMode();
    renderer.setSeekingRenderMode('origin');

    // export: pause 상태에서 0s~10s 프레임을 RGBA로 뽑아 ffmpeg로 mp4 생성
    timer.pause();

    const unsubscribeProgress = window.app.on(
      'exportVideoProgress',
      (progress) => {
        setExportState((prev) => ({
          ...prev,
          writtenFrames: progress.writtenFrames,
          totalFrames: progress.totalFrames,
          percent: progress.percent,
          outputPath: progress.outputPath,
        }));
      }
    );

    const unsubscribeError = window.app.on('exportVideoError', (message) => {
      setExportState((prev) => ({
        ...prev,
        isExporting: false,
        error: message,
      }));
    });

    try {
      const startMs = 0;
      const endMs = 10_000;
      const fps = Math.max(1, Math.round(settings.frameRate || 30));
      const stepMs = Math.max(1, Math.round(1000 / fps));
      const totalFrames = Math.floor((endMs - startMs) / stepMs) + 1;

      setExportState({
        isExporting: true,
        writtenFrames: 0,
        totalFrames,
        percent: 0,
        outputPath: '',
        error: null,
      });

      if (exportGridRef.current) {
        exportGridRef.current.innerHTML = '';
      }

      await timer.seekAndWait(startMs);
      const first = renderer.exportCurrentPixels();
      await window.app.invoke('exportVideoStart', {
        width: first.width,
        height: first.height,
        fps,
        totalFrames,
      });
      await window.app.invoke('exportVideoFrame', first.data);

      for (let ms = startMs + stepMs; ms <= endMs; ms += stepMs) {
        await timer.seekAndWait(ms);
        const { data } = renderer.exportCurrentPixels();
        await window.app.invoke('exportVideoFrame', data);
      }

      const { outputPath } = await window.app.invoke('exportVideoFinish');
      setExportState((prev) => ({
        ...prev,
        isExporting: false,
        outputPath,
        percent: 100,
      }));
    } catch (err) {
      setExportState((prev) => ({
        ...prev,
        isExporting: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      unsubscribeProgress();
      unsubscribeError();
      renderer.setSeekingRenderMode(prevMode);
    }
  };

  return (
    <>
      <div className={'grid grid-cols-3 items-center p-2'}>
        <div className="tabular-nums">
          {formatTime(timerState.currentMs)} /{' '}
          {formatTime(timerState.durationMs)}
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

      <div className="fixed right-3 bottom-3 z-50 w-[420px] max-h-[70vh] overflow-auto rounded bg-neutral-800/90 border border-neutral-700 p-2">
        <div className="text-xs text-neutral-200 mb-2">
          Export (0~10s) → ~/Downloads/output.mp4
        </div>

        <div className="text-[11px] text-neutral-200 tabular-nums mb-2">
          {exportState.error ? (
            <span className="text-red-300">{exportState.error}</span>
          ) : exportState.isExporting ? (
            <span>
              {exportState.percent.toFixed(1)}% ({exportState.writtenFrames}/
              {exportState.totalFrames})
            </span>
          ) : exportState.outputPath ? (
            <span>Done: {exportState.outputPath}</span>
          ) : (
            <span>Idle</span>
          )}
        </div>

        <div ref={exportGridRef} className="grid grid-cols-2 gap-2" />
      </div>
    </>
  );
}
