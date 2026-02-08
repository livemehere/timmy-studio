import { NumberField } from '../inputs';

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
  return (
    <div className="space-y-2">
      <NumberField
        label="Start"
        value={startTime}
        onChange={(value) => {
          onChangeStartTime(value);
          onChanged?.();
        }}
        min={0}
        step={0.1}
      />
      <NumberField
        label="End"
        value={endTime}
        onChange={(value) => {
          onChangeEndTime(value);
          onChanged?.();
        }}
        min={startTime}
        step={0.1}
      />
    </div>
  );
}
