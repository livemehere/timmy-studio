import { motion, type MotionValue, useMotionValueEvent } from 'motion/react';
import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MotionNumberInputProps {
  icon?: React.ReactNode;
  value: MotionValue<number>;
  map?: (v: number) => number;
  min?: number;
  max?: number;
  step?: number;
  sensitivity?: number;
  onInteractionStart?: () => void;
  onLiveChange?: (v: number) => void;
  onCommit?: (v: number) => void;
}

export function MotionNumberInput({
  icon,
  value,
  map = (v) => v,
  min = -Infinity,
  max = Infinity,
  step = 1,
  sensitivity = 1,
  onInteractionStart,
  onLiveChange,
  onCommit,
}: MotionNumberInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  const dragStartValue = useRef(0);
  const dragAccumulated = useRef(0);
  const isDraggingRef = useRef(false);

  const commitValue = (v: number) => {
    const clampedValue = Math.min(max, Math.max(min, v));
    value.set(clampedValue);
    onCommit?.(clampedValue);
  };

  useMotionValueEvent(value, 'change', (v) => {
    if (!isDraggingRef.current) {
      ref.current!.value = String(map(v));
    }
  });

  const handleDragStart = () => {
    isDraggingRef.current = true;
    dragStartValue.current = value.get();
    dragAccumulated.current = 0;
    onInteractionStart?.();
  };

  const handleDrag = (_: any, info: any) => {
    dragAccumulated.current += info.delta.x;

    const steppedDelta =
      Math.round(dragAccumulated.current * sensitivity) * step;
    let next = dragStartValue.current + steppedDelta;
    next = Math.min(max, Math.max(min, next));

    value.set(next);
    ref.current!.value = String(map(next));

    onLiveChange?.(next);
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    const finalValue = value.get();
    onCommit?.(finalValue);
  };

  const handleFocus = () => {
    onInteractionStart?.();
  };

  const handleBlur = () => {
    const inputValue = ref.current!.value;
    if (inputValue !== '') {
      const parsedValue = map(Number(inputValue));
      commitValue(parsedValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputValue = ref.current!.value;
      const parsedValue = map(Number(inputValue));
      commitValue(parsedValue);
      ref.current!.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      const originalValue = value.get();
      value.set(originalValue);
      ref.current!.value = String(map(originalValue));
      ref.current!.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    ref.current!.value = inputValue;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 focus-within:outline-1 px-2 py-1 border hover:border-neutral-600 rounded bg-neutral-900',
        { 'border-neutral-500': ref.current === document.activeElement }
      )}
    >
      <motion.div
        drag={'x'}
        className={'shrink-0 px-1 cursor-ew-resize select-none'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        {icon}
      </motion.div>
      <input
        ref={ref}
        type={'number'}
        min={min}
        max={max}
        step={step}
        defaultValue={value.get()}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        className={
          'outline-none flex-1 [&::-webkit-inner-spin-button]:appearance-none w-full bg-transparent'
        }
      />
    </div>
  );
}
