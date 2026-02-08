import { NumberField } from '../inputs';

interface TrimPropertyProps {
  trimStart: number;
  trimEnd: number;
  onChangeTrimStart: (value: number) => void;
  onChangeTrimEnd: (value: number) => void;
  onChanged?: () => void;
}

export function TrimProperty({
  trimStart,
  trimEnd,
  onChangeTrimStart,
  onChangeTrimEnd,
  onChanged,
}: TrimPropertyProps) {
  return (
    <div className="space-y-2">
      <NumberField
        label="Start"
        value={trimStart}
        onChange={(value) => {
          onChangeTrimStart(value);
          onChanged?.();
        }}
        min={0}
        step={0.1}
      />
      <NumberField
        label="End"
        value={trimEnd}
        onChange={(value) => {
          onChangeTrimEnd(value);
          onChanged?.();
        }}
        min={0}
        step={0.1}
      />
    </div>
  );
}
