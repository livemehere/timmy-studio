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

      const startMs = 0;
      const endMs = settings.duration;
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
      const doneOutput = await waitForWorker((d) =>
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

      setExportState((prev) => ({
        ...prev,
        isExporting: false,
        outputPath: doneOutput,
        percent: 100,
      }));

      worker.terminate();
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

        <div className="text-[10px] text-neutral-200 tabular-nums mb-2">
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
