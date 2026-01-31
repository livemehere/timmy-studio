import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface RangeFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function RangeField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: RangeFieldProps) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-neutral-400 w-24 shrink-0 text-sm">{label}</Label>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <span className="text-sm text-neutral-300 w-12 text-right tabular-nums">
        {value}
      </span>
    </div>
  );
}
