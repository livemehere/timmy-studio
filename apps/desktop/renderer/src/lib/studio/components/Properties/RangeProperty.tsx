import { MotionNumberInput } from '@/lib/motion-input';
import { ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';
import { useMotionValue, useMotionValueEvent } from 'motion/react';
import { useMemo } from 'react';

interface RangePropertyProps {
  defaultStartTime: number;
  defaultEndTime: number;
  durationMs: number;
  onCommitStartTime: (value: number) => void;
  onCommitEndTime: (value: number) => void;
  onLiveStartTimeChange?: (value: number) => void;
  onLiveEndTimeChange?: (value: number) => void;
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
  const clipDuration = useMemo(
    () => Math.max(0, defaultEndTime - defaultStartTime),
    [defaultEndTime, defaultStartTime]
  );

  const { minStart, maxStart, minEnd, maxEnd } = useMemo(() => {
    const minStart = 0;
    const maxStart = Math.max(0, durationMs - clipDuration);
    const minEnd = clipDuration;
    const maxEnd = Math.max(minEnd, durationMs);
    return { minStart, maxStart, minEnd, maxEnd };
  }, [durationMs, clipDuration]);

  const applyStartChange = (value: number, commit: boolean) => {
    const nextStart = Math.max(minStart, Math.min(value, maxStart));
    const nextEnd = nextStart + clipDuration;

    // endtime 을 함께 업데이트 함께 해야함
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

    // starttime 을 함께 업데이트 함께 해야함
    startTimeValue.set(nextStart);

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
          min={minStart}
          max={maxStart}
          step={100}
          map={(v) => parseInt(v.toFixed(0))}
          icon={<ArrowLeftToLine size={14} />}
          onCommit={(v) => applyStartChange(v, true)}
        />
        <MotionNumberInput
          className="flex-1"
          value={endTimeValue}
          min={minEnd}
          max={maxEnd}
          step={100}
          map={(v) => parseInt(v.toFixed(0))}
          icon={<ArrowRightToLine size={14} />}
          onCommit={(v) => applyEndChange(v, true)}
        />
      </div>
    </div>
  );
}
