import { MotionNumberInput } from '@/lib/motion-input';
import { ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';
import { useMotionValue, useMotionValueEvent } from 'motion/react';
import { useMemo } from 'react';

interface TrimPropertyProps {
  defaultTrimStart: number;
  defaultTrimEnd: number;
  maxTrimMs: number;
  onCommitTrimStart: (value: number) => void;
  onCommitTrimEnd: (value: number) => void;
  onLiveTrimStartChange?: (value: number) => void;
  onLiveTrimEndChange?: (value: number) => void;
}

export function TrimProperty({
  defaultTrimStart,
  defaultTrimEnd,
  maxTrimMs,
  onCommitTrimStart,
  onCommitTrimEnd,
  onLiveTrimStartChange,
  onLiveTrimEndChange,
}: TrimPropertyProps) {
  const trimStartValue = useMotionValue(defaultTrimStart);
  const trimEndValue = useMotionValue(defaultTrimEnd);

  const { minStart, maxStart, minEnd, maxEnd } = useMemo(() => {
    const minStart = 0;
    const minEnd = 0;
    const maxStart = Math.max(0, maxTrimMs - defaultTrimEnd);
    const maxEnd = Math.max(0, maxTrimMs - defaultTrimStart);
    return { minStart, maxStart, minEnd, maxEnd };
  }, [maxTrimMs, defaultTrimStart, defaultTrimEnd]);

  const applyTrimStartChange = (value: number, commit: boolean) => {
    const nextStart = Math.max(minStart, Math.min(value, maxStart));

    if (commit) {
      onCommitTrimStart(nextStart);
      return;
    }
    onLiveTrimStartChange?.(nextStart);
  };

  const applyTrimEndChange = (value: number, commit: boolean) => {
    const nextEnd = Math.max(minEnd, Math.min(value, maxEnd));

    if (commit) {
      onCommitTrimEnd(nextEnd);
      return;
    }
    onLiveTrimEndChange?.(nextEnd);
  };

  useMotionValueEvent(trimStartValue, 'change', (value) => {
    applyTrimStartChange(value, false);
  });

  useMotionValueEvent(trimEndValue, 'change', (value) => {
    applyTrimEndChange(value, false);
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <MotionNumberInput
          className="flex-1"
          value={trimStartValue}
          min={minStart}
          max={maxStart}
          step={100}
          map={(v) => parseInt(v.toFixed(0))}
          icon={<ArrowLeftToLine size={14} />}
          onCommit={(v) => applyTrimStartChange(v, true)}
        />
        <MotionNumberInput
          className="flex-1"
          value={trimEndValue}
          min={minEnd}
          max={maxEnd}
          step={100}
          map={(v) => parseInt(v.toFixed(0))}
          icon={<ArrowRightToLine size={14} />}
          onCommit={(v) => applyTrimEndChange(v, true)}
        />
      </div>
    </div>
  );
}
