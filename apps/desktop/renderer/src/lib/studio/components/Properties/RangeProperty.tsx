import { useMotionValue } from 'motion/react';
import { useEffect } from 'react';
import { MotionNumberInput } from '@/lib/motion-input';
import { Play, Square } from 'lucide-react';

interface RangePropertyProps {
  startTime: number;
  endTime: number;
  onChangeStartTime: (value: number) => void;
  onChangeEndTime: (value: number) => void;
  onChanged?: () => void;
  onLiveStartTimeChange?: (value: number) => void;
  onLiveEndTimeChange?: (value: number) => void;
  onInteractionStart?: () => void;
}

export function RangeProperty({
  startTime,
  endTime,
  onChangeStartTime,
  onChangeEndTime,
  onChanged,
  onLiveStartTimeChange,
  onLiveEndTimeChange,
  onInteractionStart,
}: RangePropertyProps) {
  const startTimeValue = useMotionValue(startTime);
  const endTimeValue = useMotionValue(endTime);

  useEffect(() => {
    startTimeValue.set(startTime);
  }, [startTime]);

  useEffect(() => {
    endTimeValue.set(endTime);
  }, [endTime]);

  const handleStartTimeCommit = (v: number) => {
    onChangeStartTime(v);
    onChanged?.();
    // TODO: undo history push
  };

  const handleEndTimeCommit = (v: number) => {
    onChangeEndTime(v);
    onChanged?.();
    // TODO: undo history push
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <MotionNumberInput
          value={startTimeValue}
          map={(v) => Math.max(0, Number(v.toFixed(2)))}
          onLiveChange={onLiveStartTimeChange}
          onCommit={handleStartTimeCommit}
          onInteractionStart={onInteractionStart}
          min={0}
          step={0.1}
          icon={<Play size={14} />}
        />
        <MotionNumberInput
          value={endTimeValue}
          map={(v) => Math.max(startTimeValue.get(), Number(v.toFixed(2)))}
          onLiveChange={onLiveEndTimeChange}
          onCommit={handleEndTimeCommit}
          onInteractionStart={onInteractionStart}
          min={startTimeValue.get()}
          step={0.1}
          icon={<Square size={14} />}
        />
      </div>
    </div>
  );
}
