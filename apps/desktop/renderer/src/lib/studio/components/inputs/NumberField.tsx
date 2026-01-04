interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showRange?: boolean;
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  showRange = false,
}: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-3">
        <span className="text-sm text-neutral-400 w-24 shrink-0">{label}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="flex-1 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neutral-500 transition-colors"
        />
      </label>
      {showRange && (
        <div className="ml-[100px]">
          <input
            type="range"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      )}
    </div>
  );
}
