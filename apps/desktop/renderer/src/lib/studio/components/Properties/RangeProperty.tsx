import { RtNumberInput } from '@/lib/motion-input';
import { ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';

interface RangePropertyProps {
  defaultStartTime: number;
  defaultEndTime: number;
  onCommitStartTime: (value: number) => void;
  onCommitEndTime: (value: number) => void;
  onLiveStartTimeChange?: (value: number) => void;
  onLiveEndTimeChange?: (value: number) => void;
  onInteractionStart?: () => void;
  durationMs: number;
}

export function RangeProperty({
  defaultStartTime,
  defaultEndTime,
  onCommitStartTime,
  onCommitEndTime,
  onLiveStartTimeChange,
  onLiveEndTimeChange,
  onInteractionStart,
  durationMs,
}: RangePropertyProps) {
  const clipDuration = Math.max(0, defaultEndTime - defaultStartTime);
  const minStart = 0;
  const maxStart = Math.max(0, durationMs - clipDuration);
  const minEnd = clipDuration;
  const maxEnd = Math.max(minEnd, durationMs);

  const applyStartChange = (value: number, commit: boolean) => {
    const nextStart = Math.max(minStart, Math.min(value, maxStart));
    const nextEnd = nextStart + clipDuration;
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
    if (commit) {
      onCommitStartTime(nextStart);
      onCommitEndTime(nextEnd);
      return;
    }
    onLiveStartTimeChange?.(nextStart);
    onLiveEndTimeChange?.(nextEnd);
  };

  const handleStartTimeLiveChange = (value: number) => {
    applyStartChange(value, false);
  };

  const handleEndTimeLiveChange = (value: number) => {
    applyEndChange(value, false);
  };

  const handleStartTimeCommit = (value: number) => {
    applyStartChange(value, true);
  };

  const handleEndTimeCommit = (value: number) => {
    applyEndChange(value, true);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <RtNumberInput
          defaultValue={defaultStartTime}
          map={(v) => Math.max(minStart, Math.min(v, maxStart))}
          onChange={handleStartTimeLiveChange}
          onCommit={handleStartTimeCommit}
          onInteractionStart={onInteractionStart}
          min={minStart}
          max={maxStart}
          step={100}
          icon={<ArrowLeftToLine size={14} />}
        />
        <RtNumberInput
          defaultValue={defaultEndTime}
          map={(v) => Math.max(minEnd, Math.min(v, maxEnd))}
          onChange={handleEndTimeLiveChange}
          onCommit={handleEndTimeCommit}
          onInteractionStart={onInteractionStart}
          min={minEnd}
          max={maxEnd}
          step={100}
          icon={<ArrowRightToLine size={14} />}
        />
      </div>
    </div>
  );
}
