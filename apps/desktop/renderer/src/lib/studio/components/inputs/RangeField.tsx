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
    <label className="flex items-center gap-3">
      <span className="text-sm text-neutral-400 w-24 shrink-0">{label}</span>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="flex-1 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <span className="text-sm text-neutral-300 w-12 text-right">{value}</span>
    </label>
  );
}
