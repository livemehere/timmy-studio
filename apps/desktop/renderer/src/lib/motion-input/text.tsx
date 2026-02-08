import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  icon?: React.ReactNode;
  defaultValue: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  onInteractionStart?: () => void;
  onLiveChange?: (v: string) => void;
  onCommit?: (v: string) => void;
  className?: string;
}

/**
 * @param param0
 * @returns
 */
export function MotionTextInput({
  icon,
  defaultValue,
  onChange,
  readOnly = false,
  onInteractionStart,
  onLiveChange,
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
      onChange?.(finalValue);
      onCommit?.(finalValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const finalValue = ref.current!.value;
      onChange?.(finalValue);
      onCommit?.(finalValue);
      ref.current!.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onLiveChange?.(newValue);
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
