import { useMotionValue, useMotionValueEvent } from 'motion/react';
import { useEffect } from 'react';
import { MotionNumberInput } from '@/components/motion-number-input';
import { Play, Square } from 'lucide-react';

interface RangePropertyProps {
  startTime: number;
  endTime: number;
  onChangeStartTime: (value: number) => void;
  onChangeEndTime: (value: number) => void;
  onChanged?: () => void;
}

export function RangeProperty({
  startTime,
  endTime,
  onChangeStartTime,
  onChangeEndTime,
  onChanged,
}: RangePropertyProps) {
  const startTimeValue = useMotionValue(startTime);
  const endTimeValue = useMotionValue(endTime);

  useEffect(() => {
    startTimeValue.set(startTime);
  }, [startTime]);

  useEffect(() => {
    endTimeValue.set(endTime);
  }, [endTime]);

  useMotionValueEvent(startTimeValue, 'change', (v) => {
    onChangeStartTime(v);
  });

  useMotionValueEvent(endTimeValue, 'change', (v) => {
    onChangeEndTime(v);
  });

  const handleStartTimeChange = (v: number) => {
    onChangeStartTime(v);
    onChanged?.();
  };

  const handleEndTimeChange = (v: number) => {
    onChangeEndTime(v);
    onChanged?.();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <MotionNumberInput
          value={startTimeValue}
          map={(v) => Math.max(0, Number(v.toFixed(2)))}
          onChange={handleStartTimeChange}
          min={0}
          step={0.1}
          icon={<Play size={14} />}
        />
        <MotionNumberInput
          value={endTimeValue}
          map={(v) => Math.max(startTimeValue.get(), Number(v.toFixed(2)))}
          onChange={handleEndTimeChange}
          min={startTimeValue.get()}
          step={0.1}
          icon={<Square size={14} />}
        />
      </div>
    </div>
  );
}
