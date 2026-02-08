import { NumberField } from '../inputs';

interface VolumePropertyProps {
  volume: number;
  onChangeVolume: (value: number) => void;
  onChanged?: () => void;
}

export function VolumeProperty({
  volume,
  onChangeVolume,
  onChanged,
}: VolumePropertyProps) {
  return (
    <NumberField
      label="Volume"
      value={volume}
      onChange={(value) => {
        onChangeVolume(value);
        onChanged?.();
      }}
      min={0}
      max={1}
      step={0.01}
      showRange
    />
  );
}
