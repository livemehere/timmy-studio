import { motion, useMotionValueEvent, type MotionValue } from 'motion/react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  value: MotionValue<number>;
  icon?: React.ReactNode;
  readOnly?: boolean;
  className?: string;
  map?: (v: number) => number;
  min?: number;
  max?: number;
  step?: number;
  sensitivity?: number;
  onCommit?: (v: number) => void;
  commitOnExternalChange?: boolean;
}

export function MotionNumberInput({
  icon,
  value,
  map = (v) => v,
  min = -Infinity,
  max = Infinity,
  step = 1,
  sensitivity = 1,
  readOnly = false,
  className,
  onCommit,
  commitOnExternalChange = true,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const dragStartValue = useRef(0);
  const dragAccumulated = useRef(0);
  const isDraggingRef = useRef(false);
  const isTypingRef = useRef(false);
  const lastCommittedValue = useRef(value.get());

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const commit = (by: string) => {
    const finalV = ref.current!.valueAsNumber;
    if (lastCommittedValue.current === finalV) return;
    value.set(finalV);
    lastCommittedValue.current = finalV;
    onCommit?.(finalV);
    console.log(`committed by ${by}: ${finalV}`);
  };

  const cancelEdit = () => {
    const originalValue = lastCommittedValue.current;
    value.set(originalValue);
    ref.current!.valueAsNumber = originalValue;
    ref.current!.blur();
  };

  useMotionValueEvent(value, 'change', (v) => {
    if (!isDraggingRef.current && !isTypingRef.current) {
      ref.current!.valueAsNumber = v;
      if (commitOnExternalChange) {
        commit('external change');
      }
    }
  });

  const onPointerDown = () => {
    isDraggingRef.current = true;
    dragAccumulated.current = 0;

    const startV = ref.current!.valueAsNumber;
    value.set(startV);
    lastCommittedValue.current = startV;
    dragStartValue.current = startV;
  };

  const onDrag = (_: any, info: any) => {
    dragAccumulated.current += info.delta.x;

    const steppedDelta =
      Math.round(dragAccumulated.current * sensitivity) * step;
    let next = dragStartValue.current + steppedDelta;
    next = map(clamp(next));
    value.set(next);
    ref.current!.valueAsNumber = next;
  };

  const onDragEnd = () => {
    isDraggingRef.current = false;
    commit('drag end');
  };

  const onBlur = () => {
    isTypingRef.current = false;
    commit('blur');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      isTypingRef.current = false;
      commit('enter');
      ref.current!.blur();
      console.log('commit by enter');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      isTypingRef.current = false;
      cancelEdit();
    }
  };

  const onTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingRef.current = true;
    const parsedValue = e.target.valueAsNumber;
    if (parsedValue !== null) {
      value.set(parsedValue);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 focus-within:outline-1 px-2 py-1 border hover:border-neutral-600 rounded bg-neutral-900 focus:border-neutral-500',
        className
      )}
    >
      <motion.div
        drag={'x'}
        className={'shrink-0 px-1 cursor-ew-resize select-none'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={false}
        onPointerDown={onPointerDown}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
      >
        {icon}
      </motion.div>
      <input
        ref={ref}
        defaultValue={value.get()}
        type={'number'}
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onChange={onTyping}
        className={
          'outline-none flex-1 [&::-webkit-inner-spin-button]:appearance-none w-full bg-transparent'
        }
      />
    </div>
  );
}
