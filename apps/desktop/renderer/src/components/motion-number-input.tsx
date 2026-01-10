import { motion, type MotionValue, useMotionValueEvent } from 'motion/react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

function MotionNumberInput({
  icon,
  value,
  onChange,
  map = (v) => v,
  min = -Infinity,
  max = Infinity,
  step = 1,
  sensitivity = 1,
}: {
  icon?: React.ReactNode;
  value: MotionValue<number>;
  onChange: (v: number) => void;
  map?: (v: number) => number;
  min?: number;
  max?: number;
  step?: number;
  sensitivity?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const dragStartValue = useRef(0);
  const dragAccumulated = useRef(0);

  useMotionValueEvent(value, 'change', (v) => {
    onChange(v);
    ref.current!.value = String(map(v));
  });

  return (
    <div
      className={cn(
        'flex items-center gap-2 focus-within:outline-1 px-2 py-1 border hover:border-neutral-600 rounded bg-neutral-900'
      )}
    >
      <motion.div
        drag={'x'}
        className={'shrink-0 px-1 cursor-ew-resize select-none'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={false}
        onDragStart={() => {
          dragStartValue.current = value.get();
          dragAccumulated.current = 0;
        }}
        onDrag={(_, info) => {
          dragAccumulated.current += info.delta.x;

          // 픽셀 → 값 변환 (감도)
          const steppedDelta =
            Math.round(dragAccumulated.current * sensitivity) * step;

          let next = dragStartValue.current + steppedDelta;

          // clamp
          next = Math.min(max, Math.max(min, next));

          value.set(next);
          ref.current!.value = String(map(next));
        }}
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
        onChange={(e) => {
          const v = map(Number(e.target.value));
          value.set(v);
        }}
        className={
          'outline-none flex-1 [&::-webkit-inner-spin-button]:appearance-none w-full'
        }
      />
    </div>
  );
}

export { MotionNumberInput };
