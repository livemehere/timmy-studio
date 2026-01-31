import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showRange?: boolean;
  unit?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  showRange = false,
  unit,
}: NumberFieldProps) {
  // Format display value based on step
  const displayValue = step < 1 ? value.toFixed(2) : value.toString();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <Label className="text-neutral-400 w-24 shrink-0 text-sm">
          {label}
        </Label>
        <div className="flex-1 flex items-center gap-2">
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            min={min}
            max={max}
            step={step}
            className={cn(
              'flex-1 h-8 bg-neutral-800/50 border-neutral-700',
              'focus-visible:border-neutral-500 focus-visible:ring-0',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
            )}
          />
          {unit && (
            <span className="text-xs text-neutral-500 shrink-0">{unit}</span>
          )}
        </div>
      </div>
      {showRange && (
        <div className="ml-[108px] flex items-center gap-2">
          <Slider
            value={[value]}
            onValueChange={([v]) => onChange(v)}
            min={min}
            max={max}
            step={step}
            className="flex-1"
          />
          <span className="text-[10px] text-neutral-500 w-10 text-right font-mono">
            {displayValue}
          </span>
        </div>
      )}
    </div>
  );
}
