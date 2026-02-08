import { motion, useMotionValue, useMotionValueEvent } from 'motion/react';
import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { RealTimeInputProps } from './types';

interface Props {
  map?: (v: number) => number;
  min?: number;
  max?: number;
  step?: number;
  sensitivity?: number;
}

export function RtNumberInput({
  icon,
  defaultValue,
  map = (v) => v,
  min = -Infinity,
  max = Infinity,
  step = 1,
  sensitivity = 1,
  onChange,
  onInteractionStart,
  onCommit,
  className,
}: Props & RealTimeInputProps<number>) {
  const ref = useRef<HTMLInputElement>(null);
  const value = useMotionValue(defaultValue);
  const dragStartValue = useRef(0);
  const dragAccumulated = useRef(0);
  const isDraggingRef = useRef(false);
  const lastCommittedValue = useRef(defaultValue);

  const clampValue = (v: number) => Math.min(max, Math.max(min, v));

  const parseInputValue = (rawValue: string) => {
    if (rawValue.trim() === '') return null;
    const parsedValue = Number(rawValue);
    if (Number.isNaN(parsedValue)) return null;
    return clampValue(parsedValue);
  };

  const commitValue = (v: number) => {
    const clampedValue = clampValue(v);
    value.set(clampedValue);
    onChange?.(clampedValue);
    onCommit?.(clampedValue);
    lastCommittedValue.current = clampedValue;
  };

  const cancelEdit = () => {
    const originalValue = lastCommittedValue.current;
    value.set(originalValue);
    ref.current!.value = String(map(originalValue));
    ref.current!.blur();
  };

  useMotionValueEvent(value, 'change', (v) => {
    if (!isDraggingRef.current) {
      ref.current!.value = String(map(v));
      lastCommittedValue.current = v;
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

    onChange?.(next);
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    const finalValue = value.get();
    onCommit?.(finalValue);
    lastCommittedValue.current = finalValue;
  };

  const handleFocus = () => {
    onInteractionStart?.();
  };

  const handleBlur = () => {
    const parsedValue = parseInputValue(ref.current!.value);
    if (parsedValue !== null) {
      commitValue(map(parsedValue));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsedValue = parseInputValue(ref.current!.value);
      if (parsedValue !== null) {
        commitValue(map(parsedValue));
      }
      ref.current!.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    ref.current!.value = inputValue;
    const parsedValue = parseInputValue(inputValue);
    if (parsedValue !== null) {
      onChange?.(parsedValue);
    }
  };

  useEffect(() => {
    value.set(defaultValue);
    ref.current!.value = String(map(defaultValue));
    lastCommittedValue.current = defaultValue;
  }, [defaultValue, map, value]);

  return (
    <div
      className={cn(
        'flex items-center gap-2 focus-within:outline-1 px-2 py-1 border hover:border-neutral-600 rounded bg-neutral-900',
        { 'border-neutral-500': ref.current === document.activeElement },
        className
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
        defaultValue={defaultValue}
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
