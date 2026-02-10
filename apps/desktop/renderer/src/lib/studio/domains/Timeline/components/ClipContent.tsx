import { useMemo } from 'react';
import type { IClip } from '../../Clip/types';

export function ClipContent({
  clip,
  isLoaded,
  isFailed,
  displayStartTime,
  displayEndTime,
  displayTrimStart,
  displayTrimEnd,
}: {
  clip: IClip;
  isLoaded: boolean;
  isFailed: boolean;
  displayStartTime: number;
  displayEndTime: number;
  displayTrimStart: number;
  displayTrimEnd: number;
}) {
  const durationSec = useMemo(
    () => ((displayEndTime - displayStartTime) / 1000).toFixed(2),
    [displayEndTime, displayStartTime]
  );
  const isTrimmed = displayTrimStart > 0 || displayTrimEnd > 0;

  return (
    <div className="flex flex-col pointer-events-none">
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-0.5 bg-black/20">
        <span className="text-[10px] truncate flex-1">{clip.name}</span>
        <StatusLight isLoaded={isLoaded} isFailed={isFailed} />
      </div>

      {/* Body */}
      <div className="flex-1 px-2 py-0.5 flex items-center justify-between">
        {/* Duration */}
        <span className="text-[10px] text-white/60 truncate">
          {durationSec}s
        </span>

        {/* trim */}
        {isTrimmed && (
          <span className="text-[9px] text-yellow-400/70 font-mono">
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
