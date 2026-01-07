import { useDocStore, useEngineStore } from '../hooks/useStudioStores';
import { PauseIcon, PlayIcon, HardDriveUploadIcon, Music } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { formatTime } from '../utils/time';

export function TimerActionBar() {
  const timer = useEngineStore((state) => state.timer);
  const settings = useDocStore((state) => state.settings);
  const renderer = useEngineStore((state) => state.renderer);
  const audioRenderer = useEngineStore((state) => state.audioRenderer);
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

  const [audioExportState, setAudioExportState] = useState<{
    isExporting: boolean;
    percent: number;
    outputPath: string;
    error: string | null;
  }>({
    isExporting: false,
    percent: 0,
    outputPath: '',
    error: null,
  });
  const [timerState, setTimerState] = useState({
    currentMs: 0,
    isPlaying: false,
    durationMs: 0,
  });

  const [showExportSettings, setShowExportSettings] = useState(false);
  const [exportRange, setExportRange] = useState({ start: 0, end: 0 });

  useEffect(() => {
    if (settings.duration) {
      setExportRange((prev) => ({ ...prev, end: settings.duration }));
    }
  }, [settings.duration]);

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

  const handleExport = async (options?: {
    startMs?: number;
    endMs?: number;
  }) => {
    if (!timer || !renderer) return;

    const prevMode = renderer.seekingRenderMode;
    renderer.seekingRenderMode = 'origin';

    // export: pause 상태에서 0s~10s 프레임을 RGBA로 뽑아 ffmpeg로 mp4 생성
    timer.pause();

    // Worker-based export: progress/error comes from worker messages
    const unsubscribeProgress = () => {};
    const unsubscribeError = () => {};

    try {
      const exportStartPerf = performance.now();
      let seekMsTotal = 0;
      let extractMsTotal = 0;
      let invokeMsTotal = 0;
      let seekMsMax = 0;
      let extractMsMax = 0;
      let invokeMsMax = 0;
      let framesSent = 0;

      const startMs = options?.startMs ?? 0;
      const endMs = options?.endMs ?? settings.duration;
      const fps = Math.max(1, Math.round(settings.frameRate || 30));
      const stepMs = Math.max(1, Math.round(1000 / fps));
      const totalFrames = Math.floor((endMs - startMs) / stepMs) + 1;

      const exportWidth = settings.width;
      const exportHeight = settings.height;

      const outputPath = '~/Downloads/output.mp4';

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

      {
        const t0 = performance.now();
        await timer.seekAndWait(startMs);
        const dt = performance.now() - t0;
        seekMsTotal += dt;
        seekMsMax = Math.max(seekMsMax, dt);
      }

      const worker = new Worker('/node-worker.js');

      const waitForWorker = <T,>(predicate: (data: any) => T | null) => {
        return new Promise<T>((resolve, reject) => {
          const onMessage = (e: MessageEvent) => {
            try {
              const out = predicate(e.data);
              if (out != null) {
                cleanup();
                resolve(out);
              }
            } catch (err) {
              cleanup();
              reject(err);
            }
          };
          const onError = (e: ErrorEvent) => {
            cleanup();
            reject(new Error(e.message || 'Worker error'));
          };
          const cleanup = () => {
            worker.removeEventListener('message', onMessage);
            worker.removeEventListener('error', onError);
          };
          worker.addEventListener('message', onMessage);
          worker.addEventListener('error', onError);
        });
      };

      let lastProgressLoggedAt = 0;
      let lastProgressPercentLogged = -1;

      worker.addEventListener('message', (e) => {
        const data = e.data;
        if (data?.type === 'progress') {
          const p = data.data || {};

          // Log progress for visibility (throttled)
          const now = performance.now();
          const percent =
            typeof p.progress === 'number' ? Number(p.progress) : null;
          const shouldLog =
            (percent != null &&
              Math.floor(percent) !== lastProgressPercentLogged) ||
            now - lastProgressLoggedAt > 1000;
          if (shouldLog) {
            lastProgressLoggedAt = now;
            if (percent != null)
              lastProgressPercentLogged = Math.floor(percent);
            console.log('[export][ffmpeg][progress]', p);
          }

          // racy but good enough for UI
          setExportState((prev) => ({
            ...prev,
            percent: typeof p.progress === 'number' ? p.progress : prev.percent,
          }));
        }
        if (data?.type === 'error') {
          setExportState((prev) => ({
            ...prev,
            isExporting: false,
            error: String(data.message || 'Worker export error'),
          }));
        }
      });

      const ffmpegPath = await window.app.invoke('ffmpeg:getPath');

      {
        const t0 = performance.now();
        worker.postMessage({ type: 'set-ffmpeg-path', path: ffmpegPath });
        worker.postMessage({
          type: 'spawn-ffmpeg',
          width: exportWidth,
          height: exportHeight,
          fps,
          output: outputPath,
          durationMs: endMs - startMs,
        });
        await waitForWorker((d) =>
          d?.type === 'ffmpeg-is-spawned' && d?.data === true ? true : null
        );
        const dt = performance.now() - t0;
        invokeMsTotal += dt;
        invokeMsMax = Math.max(invokeMsMax, dt);
      }

      const frameSizeBytes = exportWidth * exportHeight * 4;
      const maxBatchBytes = 16 * 1024 * 1024;
      const batchSize = Math.min(
        16,
        Math.max(1, Math.floor(maxBatchBytes / frameSizeBytes))
      );

      const toTransferableBuffer = (data: Uint8Array): ArrayBuffer => {
        if (
          data.buffer instanceof ArrayBuffer &&
          data.byteOffset === 0 &&
          data.byteLength === data.buffer.byteLength
        ) {
          return data.buffer;
        }
        const copy = new Uint8Array(data.byteLength);
        copy.set(data);
        return copy.buffer;
      };

      let batch: ArrayBuffer[] = [];

      const flushBatch = () => {
        if (batch.length === 0) return;
        const t0 = performance.now();
        const transfer: ArrayBuffer[] = batch.slice();
        worker.postMessage(
          {
            type: 'ffmpeg-write-batch',
            buffers: batch,
            frameSizeBytes,
          },
          transfer
        );
        const dt = performance.now() - t0;
        invokeMsTotal += dt;
        invokeMsMax = Math.max(invokeMsMax, dt);
        framesSent += batch.length;
        batch = [];
      };

      {
        const tExtract0 = performance.now();
        const { data } = renderer.exportCurrentPixels();
        const extractDt = performance.now() - tExtract0;
        extractMsTotal += extractDt;
        extractMsMax = Math.max(extractMsMax, extractDt);

        batch.push(toTransferableBuffer(data));
        if (batch.length >= batchSize) flushBatch();
      }

      for (let ms = startMs + stepMs; ms <= endMs; ms += stepMs) {
        {
          const t0 = performance.now();
          await timer.seekAndWait(ms);
          const dt = performance.now() - t0;
          seekMsTotal += dt;
          seekMsMax = Math.max(seekMsMax, dt);
        }

        const tExtract0 = performance.now();
        const { data } = renderer.exportCurrentPixels();
        const extractDt = performance.now() - tExtract0;
        extractMsTotal += extractDt;
        extractMsMax = Math.max(extractMsMax, extractDt);

        batch.push(toTransferableBuffer(data));
        if (batch.length >= batchSize) flushBatch();
      }

      flushBatch();

      const finishInvoke0 = performance.now();
      worker.postMessage({ type: 'ffmpeg-close' });
      const videoOutputPath = await waitForWorker((d) =>
        d?.type === 'done' ? String(d.output || outputPath) : null
      );
      const finishInvokeDt = performance.now() - finishInvoke0;
      invokeMsTotal += finishInvokeDt;
      invokeMsMax = Math.max(invokeMsMax, finishInvokeDt);

      const elapsed = performance.now() - exportStartPerf;
      const avg = (ms: number) => (framesSent > 0 ? ms / framesSent : 0);

      console.log(
        `[export][renderer] done frames=${framesSent}/${totalFrames} elapsed=${elapsed.toFixed(
          1
        )}ms seek=${seekMsTotal.toFixed(1)}ms(avg=${avg(seekMsTotal).toFixed(
          2
        )} max=${seekMsMax.toFixed(1)}) extract=${extractMsTotal.toFixed(
          1
        )}ms(avg=${avg(extractMsTotal).toFixed(2)} max=${extractMsMax.toFixed(
          1
        )}) invoke=${invokeMsTotal.toFixed(1)}ms(avg=${avg(
          invokeMsTotal
        ).toFixed(2)} max=${invokeMsMax.toFixed(1)})`
      );

      worker.terminate();

      console.log(
        `[export][renderer] Video export completed: ${videoOutputPath}`
      );

      // Check if we need to merge with audio
      let finalOutputPath = videoOutputPath;

      if (audioRenderer) {
        const audioTracks = audioRenderer.getExportAudioTracks();

        if (audioTracks.length > 0) {
          console.log(
            `[export][renderer] Merging ${audioTracks.length} audio tracks with video...`
          );

          try {
            const mergeResult = await window.app.invoke(
              'export:mergeWithAudio',
              {
                videoPath: videoOutputPath,
                audioTracks,
                totalDurationSec: settings.duration / 1000,
                sampleRate: settings.sampleRate || 48000,
              }
            );

            finalOutputPath = mergeResult.outputPath;
            console.log(`[export][renderer] Final output: ${finalOutputPath}`);
          } catch (mergeErr) {
            console.error('[export][renderer] Merge failed:', mergeErr);
            setExportState((prev) => ({
              ...prev,
              isExporting: false,
              error:
                'Video exported but audio merge failed: ' +
                (mergeErr instanceof Error
                  ? mergeErr.message
                  : String(mergeErr)),
            }));
            return;
          }
        } else {
          console.log('[export][renderer] No audio tracks, video-only export');
        }
      } else {
        console.log(
          '[export][renderer] AudioRenderer not available, video-only export'
        );
      }

      setExportState((prev) => ({
        ...prev,
        isExporting: false,
        outputPath: finalOutputPath,
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
      renderer.seekingRenderMode = prevMode;
    }
  };

  const handleExportAudio = async () => {
    if (!audioRenderer) {
      setAudioExportState({
        isExporting: false,
        percent: 0,
        outputPath: '',
        error: 'AudioRenderer is not initialized',
      });
      return;
    }

    try {
      setAudioExportState({
        isExporting: true,
        percent: 0,
        outputPath: '',
        error: null,
      });

      // AudioRenderer에서 오디오 트랙 정보 수집
      const audioTracks = audioRenderer.getExportAudioTracks();

      if (audioTracks.length === 0) {
        setAudioExportState({
          isExporting: false,
          percent: 0,
          outputPath: '',
          error: 'No audio clips found',
        });
        return;
      }

      console.log('[Audio Export] Collected audio tracks:', audioTracks);

      // Main 프로세스로 오디오 내보내기 요청
      const result = await window.app.invoke('export:audio', {
        tracks: audioTracks,
        totalDurationSec: settings.duration / 1000,
        sampleRate: settings.sampleRate || 48000,
      });

      setAudioExportState({
        isExporting: false,
        percent: 100,
        outputPath: result.outputPath,
        error: null,
      });

      console.log('[Audio Export] Success:', result.outputPath);
    } catch (err) {
      setAudioExportState({
        isExporting: false,
        percent: 0,
        outputPath: '',
        error: err instanceof Error ? err.message : String(err),
      });
      console.error('[Audio Export] Error:', err);
    }
  };

  return (
    <>
      <div className={'grid grid-cols-3 items-center p-2'}>
        <div className="tabular-nums text-xs">
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
        <div className="flex justify-end gap-2">
          <button
            className="flex items-center gap-2 bg-purple-700 rounded px-2 py-0.5 hover:bg-purple-600 cursor-pointer"
            onClick={handleExportAudio}
            disabled={audioExportState.isExporting}
          >
            <Music size={16} />
            <span>오디오</span>
          </button>
          <button
            className="flex items-center gap-2 bg-neutral-700 rounded px-2 py-0.5 hover:bg-neutral-600 cursor-pointer"
            onClick={() => setShowExportSettings((prev) => !prev)}
          >
            <HardDriveUploadIcon size={16} />
            <span>내보내기</span>
          </button>
        </div>
      </div>

      {showExportSettings && (
        <div className="fixed right-3 bottom-12 z-50 w-[420px] max-h-[70vh] overflow-auto rounded bg-neutral-800/95 border border-neutral-700 p-3 shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-center mb-3 border-b border-neutral-700 pb-2">
            <span className="text-sm font-medium text-neutral-200">
              내보내기 설정
            </span>
            <button
              onClick={() => setShowExportSettings(false)}
              className="text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {!exportState.isExporting && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>시작 시간</span>
                    <span className="text-neutral-200 tabular-nums">
                      {formatTime(exportRange.start)}
                    </span>
                  </div>
                  <input
                    type="range"
                    className="w-full accent-blue-500 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer"
                    min={0}
                    max={settings.duration}
                    step={100}
                    value={exportRange.start}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setExportRange((prev) => ({
                        ...prev,
                        start: Math.min(val, prev.end),
                      }));
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>종료 시간</span>
                    <span className="text-neutral-200 tabular-nums">
                      {formatTime(exportRange.end)}
                    </span>
                  </div>
                  <input
                    type="range"
                    className="w-full accent-blue-500 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer"
                    min={0}
                    max={settings.duration}
                    step={100}
                    value={exportRange.end}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setExportRange((prev) => ({
                        ...prev,
                        end: Math.max(val, prev.start),
                      }));
                    }}
                  />
                </div>

                <button
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-2 rounded transition-colors"
                  onClick={() =>
                    handleExport({
                      startMs: exportRange.start,
                      endMs: exportRange.end,
                    })
                  }
                >
                  Export MP4 ({formatTime(exportRange.end - exportRange.start)})
                </button>

                <button
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium py-2 rounded transition-colors"
                  onClick={handleExportAudio}
                  disabled={audioExportState.isExporting}
                >
                  {audioExportState.isExporting
                    ? 'Exporting Audio...'
                    : 'Export Audio (전체)'}
                </button>
              </div>
            )}

            <div className="text-[10px] text-neutral-200 tabular-nums space-y-2">
              {/* 비디오 내보내기 상태 */}
              {exportState.error ? (
                <div className="p-2 bg-red-900/50 rounded border border-red-800 text-red-200">
                  [Video] {exportState.error}
                </div>
              ) : exportState.isExporting ? (
                <div className="space-y-2">
                  <div className="w-full bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${exportState.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Exporting Video...</span>
                    <span>
                      {exportState.percent.toFixed(1)}% (
                      {exportState.writtenFrames}/{exportState.totalFrames})
                    </span>
                  </div>
                </div>
              ) : exportState.outputPath ? (
                <div className="p-2 bg-green-900/30 rounded border border-green-800 text-green-300">
                  Video Done: {exportState.outputPath}
                </div>
              ) : null}

              {/* 오디오 내보내기 상태 */}
              {audioExportState.error ? (
                <div className="p-2 bg-red-900/50 rounded border border-red-800 text-red-200">
                  [Audio] {audioExportState.error}
                </div>
              ) : audioExportState.isExporting ? (
                <div className="space-y-2">
                  <div className="w-full bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-full transition-all duration-300 animate-pulse"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Exporting Audio...</span>
                    <span>Processing...</span>
                  </div>
                </div>
              ) : audioExportState.outputPath ? (
                <div className="p-2 bg-green-900/30 rounded border border-green-800 text-green-300">
                  Audio Done: {audioExportState.outputPath}
                </div>
              ) : null}
            </div>

            <div ref={exportGridRef} className="grid grid-cols-4 gap-1" />
          </div>
        </div>
      )}
    </>
  );
}
