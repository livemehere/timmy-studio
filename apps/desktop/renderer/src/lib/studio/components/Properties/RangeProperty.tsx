import { MotionNumberInput } from '@/lib/motion-input';
import { ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';
import { useMotionValue, useMotionValueEvent } from 'motion/react';

interface RangePropertyProps {
  defaultStartTime: number;
  defaultEndTime: number;
  onCommitStartTime: (value: number) => void;
  onCommitEndTime: (value: number) => void;
  onLiveStartTimeChange?: (value: number) => void;
  onLiveEndTimeChange?: (value: number) => void;
  durationMs: number;
}

export function RangeProperty({
  defaultStartTime,
  defaultEndTime,
  onCommitStartTime,
  onCommitEndTime,
  onLiveStartTimeChange,
  onLiveEndTimeChange,
  durationMs,
}: RangePropertyProps) {
  const startTimeValue = useMotionValue(defaultStartTime);
  const endTimeValue = useMotionValue(defaultEndTime);

  const clipDuration = Math.max(0, defaultEndTime - defaultStartTime);
  const minStart = 0;
  const maxStart = Math.max(0, durationMs - clipDuration);
  const minEnd = clipDuration;
  const maxEnd = Math.max(minEnd, durationMs);

  const applyStartChange = (value: number, commit: boolean) => {
    const nextStart = Math.max(minStart, Math.min(value, maxStart));
    const nextEnd = nextStart + clipDuration;

    startTimeValue.set(nextStart);
    endTimeValue.set(nextEnd);

    if (commit) {
      onCommitStartTime(nextStart);
      onCommitEndTime(nextEnd);
      return;
    }
    onLiveStartTimeChange?.(nextStart);
    onLiveEndTimeChange?.(nextEnd);
  };

  const applyEndChange = (value: number, commit: boolean) => {
    const nextEnd = Math.max(minEnd, Math.min(value, maxEnd));
    const nextStart = nextEnd - clipDuration;

    startTimeValue.set(nextStart);
    endTimeValue.set(nextEnd);

    if (commit) {
      onCommitStartTime(nextStart);
      onCommitEndTime(nextEnd);
      return;
    }
    onLiveStartTimeChange?.(nextStart);
    onLiveEndTimeChange?.(nextEnd);
  };

  useMotionValueEvent(startTimeValue, 'change', (value) => {
    applyStartChange(value, false);
  });

  useMotionValueEvent(endTimeValue, 'change', (value) => {
    applyEndChange(value, false);
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <MotionNumberInput
          className="flex-1"
          value={startTimeValue}
          map={(v) => Math.max(minStart, Math.min(v, maxStart))}
          min={minStart}
          max={maxStart}
          step={100}
          icon={<ArrowLeftToLine size={14} />}
          onCommit={(v) => applyStartChange(v, true)}
        />
        <MotionNumberInput
          className="flex-1"
          value={endTimeValue}
          map={(v) => Math.max(minEnd, Math.min(v, maxEnd))}
          min={minEnd}
          max={maxEnd}
          step={100}
          icon={<ArrowRightToLine size={14} />}
          onCommit={(v) => applyEndChange(v, true)}
        />
      </div>
    </div>
  );
}
