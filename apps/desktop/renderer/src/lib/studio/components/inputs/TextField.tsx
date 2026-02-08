import { cn } from '@/lib/utils';

interface TextFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export function TextField({
  label,
  value,
  onChange,
  readOnly = false,
}: TextFieldProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-neutral-400 w-24 shrink-0 text-xs">{label}</span>
      <div
        className={cn(
          'flex items-center gap-2 focus-within:outline-1 px-2 py-1 border hover:border-neutral-600 rounded bg-neutral-900 flex-1'
        )}
      >
        <input
          readOnly={readOnly}
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="outline-none flex-1 w-full bg-transparent text-sm text-neutral-200"
        />
      </div>
    </div>
  );
}
