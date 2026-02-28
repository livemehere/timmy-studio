import { useMemo } from 'react';
import type { IClip } from '../../Clip/types';
import type { IFilmstripData } from '../../Asset/types';
import { FilmstripBackground } from './FilmstripBackground';

/**
 * 배경 없음 순수 콘텐츠만 렌더링
 */
export function ClipContent({
  clip,
  isLoaded,
  isFailed,
  isProxyReady,
  poolInfo,
  displayStartTime,
  displayEndTime,
  displayTrimStart,
  displayTrimEnd,
  pxPerSec,
  filmstripData,
}: {
  clip: IClip;
  isLoaded: boolean;
  isFailed: boolean;
  isProxyReady?: boolean; // undefined = not a video clip
  poolInfo?: {
    totalSlots: number;
    usedSlots: number;
    thisAcquired: boolean;
  } | null;
  displayStartTime: number;
  displayEndTime: number;
  displayTrimStart: number;
  displayTrimEnd: number;
  pxPerSec?: number;
  filmstripData?: IFilmstripData;
}) {
  const durationSec = useMemo(
    () => ((displayEndTime - displayStartTime) / 1000).toFixed(2),
    [displayEndTime, displayStartTime]
  );
  const isTrimmed = displayTrimStart > 0 || displayTrimEnd > 0;

  const clipWidthPx = useMemo(
    () => ((displayEndTime - displayStartTime) / 1000) * (pxPerSec ?? 0),
    [displayEndTime, displayStartTime, pxPerSec]
  );

  const hasFilmstrip =
    clip.type === 'video' && filmstripData && pxPerSec && clipWidthPx > 0;

  return (
    <div className="relative flex flex-col h-full pointer-events-none select-none">
      {/* Filmstrip background layer (video clips only) */}
      {hasFilmstrip && (
        <FilmstripBackground
          filmstripData={filmstripData}
          trimStart={displayTrimStart}
          pxPerSec={pxPerSec}
          clipWidthPx={clipWidthPx}
        />
      )}

      {/* Header */}
      <div
        className={`relative z-10 flex items-center gap-1 px-2 py-0.5 ${hasFilmstrip ? 'bg-black/40' : 'bg-black/20'}`}
      >
        <span className="text-[10px] truncate flex-1">{clip.name}</span>
        {poolInfo && <PoolBadge poolInfo={poolInfo} />}
        {isProxyReady !== undefined && <ProxyBadge ready={isProxyReady} />}
        <StatusLight isLoaded={isLoaded} isFailed={isFailed} />
      </div>

      {/* Body */}
      <div className="relative z-10 flex-1 px-2 py-0.5 flex items-end justify-between">
        {/* Duration */}
        <span
          className={`text-[10px] truncate ${hasFilmstrip ? 'text-white/80 drop-shadow-sm' : 'text-white/60'}`}
        >
          {durationSec}s
        </span>

        {/* trim */}
        {isTrimmed && (
          <span
            className={`text-[9px] font-mono ${hasFilmstrip ? 'text-yellow-300/90 drop-shadow-sm' : 'text-yellow-400/70'}`}
          >
            {(displayTrimStart / 1000).toFixed(2)}-
            {(displayTrimEnd / 1000).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusLight({
  isLoaded,
  isFailed,
}: {
  isLoaded: boolean;
  isFailed: boolean;
}) {
  if (isFailed) {
    return (
      <span
        className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400"
        title="Failed"
      />
    );
  }

  if (isLoaded) {
    return (
      <span
        className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400"
        title="Synced"
      />
    );
  }

  return null;
}

/** Proxy 상태 뱃지 — 준비 완료 시 ⚡, 처리 중 시 깜박이는 텍스트 뱃지 */
function ProxyBadge({ ready }: { ready: boolean }) {
  if (ready) {
    return (
      <span
        className="shrink-0 text-[8px] leading-none px-1 py-px rounded bg-cyan-500/30 text-cyan-300 font-medium"
        title="Proxy ready"
      >
        ⚡
      </span>
    );
  }

  return (
    <span
      className="shrink-0 text-[8px] leading-none px-1 py-px rounded bg-orange-500/25 text-orange-300/80 font-medium animate-pulse"
      title="Proxy encoding…"
    >
      ⏳
    </span>
  );
}

/** Video Pool 상태 뱃지 — 슬롯 사용 현황 표시 */
function PoolBadge({
  poolInfo,
}: {
  poolInfo: { totalSlots: number; usedSlots: number; thisAcquired: boolean };
}) {
  const { totalSlots, usedSlots, thisAcquired } = poolInfo;
  return (
    <span
      className={`shrink-0 text-[8px] leading-none px-1 py-px rounded font-mono ${
        thisAcquired
          ? 'bg-violet-500/30 text-violet-300'
          : 'bg-neutral-500/25 text-neutral-400'
      }`}
      title={`Pool: ${usedSlots}/${totalSlots} used${thisAcquired ? ' (this clip holds a slot)' : ''}`}
    >
      {thisAcquired ? '▶' : '○'} {usedSlots}/{totalSlots}
    </span>
  );
}
