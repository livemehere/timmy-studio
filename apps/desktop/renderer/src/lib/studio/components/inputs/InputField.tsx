import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Click to change color</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
