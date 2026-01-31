import { useDocStore, useEngineStore } from '../hooks/useStudioStores';
import {
  PauseIcon,
  PlayIcon,
  HardDriveUploadIcon,
  SkipBack,
  SkipForward,
  Film,
  Music,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { formatTime } from '../utils/time';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
    <TooltipProvider>
      <div className="grid grid-cols-3 items-center px-4 py-2">
        {/* Timecode Display */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-800/80 rounded-md overflow-hidden border border-neutral-700/50">
            <span className="tabular-nums text-sm font-mono text-white px-2.5 py-1 min-w-[70px] text-center">
              {formatTime(timerState.currentMs)}
            </span>
            <span className="text-neutral-600 text-xs px-1 bg-neutral-900/50">
              /
            </span>
            <span className="tabular-nums text-xs font-mono text-neutral-400 px-2 py-1">
              {formatTime(timerState.durationMs)}
            </span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex justify-center items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => timer?.seek(0)}
                className="rounded-full w-8 h-8"
              >
                <SkipBack size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go to start (Home)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={timerState.isPlaying ? 'default' : 'ghost'}
                size="icon-sm"
                onClick={handlePlay}
                className="rounded-full w-10 h-10 transition-all"
              >
                {timerState.isPlaying ? (
                  <PauseIcon size={20} />
                ) : (
                  <PlayIcon size={20} className="ml-0.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{timerState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => timer?.seek(timerState.durationMs)}
                className="rounded-full w-8 h-8"
              >
                <SkipForward size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go to end (End)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Export Button */}
        <div className="flex justify-end gap-2">
          <Dialog
            open={showExportSettings}
            onOpenChange={setShowExportSettings}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <HardDriveUploadIcon size={14} />
                <span>Export</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <HardDriveUploadIcon size={18} />
                  Export Settings
                </DialogTitle>
                <DialogDescription>
                  Configure the export range for video and audio.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Export Range */}
                {!exportState.isExporting && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Start Time</span>
                        <Badge variant="secondary" className="font-mono">
                          {formatTime(exportRange.start)}
                        </Badge>
                      </div>
                      <Slider
                        value={[exportRange.start]}
                        max={settings.duration}
                        step={100}
                        onValueChange={([val]) =>
                          setExportRange((prev) => ({
                            ...prev,
                            start: Math.min(val, prev.end),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">End Time</span>
                        <Badge variant="secondary" className="font-mono">
                          {formatTime(exportRange.end)}
                        </Badge>
                      </div>
                      <Slider
                        value={[exportRange.end]}
                        max={settings.duration}
                        step={100}
                        onValueChange={([val]) =>
                          setExportRange((prev) => ({
                            ...prev,
                            end: Math.max(val, prev.start),
                          }))
                        }
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1 gap-2"
                        onClick={() =>
                          handleExport({
                            startMs: exportRange.start,
                            endMs: exportRange.end,
                          })
                        }
                      >
                        <Film size={16} />
                        Export MP4 (
                        {formatTime(exportRange.end - exportRange.start)})
                      </Button>

                      <Button
                        variant="secondary"
                        className="flex-1 gap-2"
                        onClick={handleExportAudio}
                        disabled={audioExportState.isExporting}
                      >
                        <Music size={16} />
                        {audioExportState.isExporting
                          ? 'Exporting...'
                          : 'Export Audio'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Export Status */}
                <div className="space-y-3">
                  {/* Video Export Progress */}
                  {exportState.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Video Export Error</AlertTitle>
                      <AlertDescription>{exportState.error}</AlertDescription>
                    </Alert>
                  )}

                  {exportState.isExporting && (
                    <div className="space-y-2 p-3 bg-neutral-800/50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Film size={14} className="text-blue-400" />
                          Exporting Video...
                        </span>
                        <span className="font-mono text-xs">
                          {exportState.percent.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={exportState.percent} className="h-2" />
                      <div className="text-xs text-neutral-500">
                        {exportState.writtenFrames} / {exportState.totalFrames}{' '}
                        frames
                      </div>
                    </div>
                  )}

                  {exportState.outputPath && !exportState.isExporting && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertTitle>Video Export Complete</AlertTitle>
                      <AlertDescription className="font-mono text-xs truncate">
                        {exportState.outputPath}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Audio Export Progress */}
                  {audioExportState.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Audio Export Error</AlertTitle>
                      <AlertDescription>
                        {audioExportState.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {audioExportState.isExporting && (
                    <div className="space-y-2 p-3 bg-neutral-800/50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Music size={14} className="text-purple-400" />
                          Exporting Audio...
                        </span>
                      </div>
                      <Progress value={100} className="h-2 animate-pulse" />
                    </div>
                  )}

                  {audioExportState.outputPath &&
                    !audioExportState.isExporting && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertTitle>Audio Export Complete</AlertTitle>
                        <AlertDescription className="font-mono text-xs truncate">
                          {audioExportState.outputPath}
                        </AlertDescription>
                      </Alert>
                    )}
                </div>

                <div ref={exportGridRef} className="grid grid-cols-4 gap-1" />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
}
