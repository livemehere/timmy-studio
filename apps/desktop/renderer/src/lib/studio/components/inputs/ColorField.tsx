import { cn } from '@/lib/utils';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export function ColorField({
  label,
  value,
  onChange,
  readOnly = false,
}: ColorFieldProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-neutral-400 w-24 shrink-0 text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-md border border-neutral-600 overflow-hidden cursor-pointer hover:border-neutral-500 transition-colors shadow-sm"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            readOnly={readOnly}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="opacity-0 w-full h-full cursor-pointer"
          />
        </div>
        <span className="text-xs text-neutral-500 font-mono uppercase">
          {value}
        </span>
      </div>
    </div>
  );
}
