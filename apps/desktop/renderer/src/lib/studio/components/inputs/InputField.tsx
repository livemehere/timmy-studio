import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface InputFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'color';
  readOnly?: boolean;
}

export function InputField({
  label,
  value,
  onChange,
  type = 'text',
  readOnly = false,
}: InputFieldProps) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-neutral-400 w-24 shrink-0 text-sm">{label}</Label>
      {type === 'color' ? (
        <input
          type="color"
          readOnly={readOnly}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
        />
      ) : (
        <Input
          readOnly={readOnly}
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            'flex-1 h-8 bg-neutral-800/50 border-neutral-700',
            'focus-visible:border-neutral-500 focus-visible:ring-0'
          )}
        />
      )}
    </div>
  );
}
