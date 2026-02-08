import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { RealTimeInputProps } from './types';

type Props = RealTimeInputProps<string>;

export function RtTextInput({
  icon,
  defaultValue,
  onChange,
  readOnly = false,
  onInteractionStart,
  onCommit,
  //  ---
  className,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    onInteractionStart?.();
  };

  const handleBlur = () => {
    const finalValue = ref.current!.value;
    if (defaultValue !== finalValue) {
      onCommit?.(finalValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const finalValue = ref.current!.value;
      onCommit?.(finalValue);
      ref.current!.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange?.(newValue);
  };

  const cancelEdit = () => {
    ref.current!.value = defaultValue;
    ref.current!.blur();
  };

  useEffect(() => {
    ref.current!.value = defaultValue;
  }, [defaultValue]);

  return (
    <div
      className={cn(
        'flex items-center gap-2 focus-within:outline-1 px-2 py-1 border hover:border-neutral-600 rounded bg-neutral-900',
        className
      )}
    >
      {icon && (
        <motion.div className={'shrink-0 px-1 select-none'}>{icon}</motion.div>
      )}
      <input
        ref={ref}
        readOnly={readOnly}
        type="text"
        defaultValue={defaultValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        className="outline-none flex-1 w-full bg-transparent text-xs text-neutral-200"
      />
    </div>
  );
}
