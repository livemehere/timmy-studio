import { motion, type MotionValue, useMotionValueEvent } from 'motion/react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

function MotionNumberInput({
  icon,
  value,
  onChange,
  map = (v) => v,
}: {
  icon?: React.ReactNode;
  value: MotionValue<number>;
  onChange: (v: number) => void;
  map?: (v: number) => number;
}) {
  const ref = useRef<HTMLInputElement>(null);

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
        onDrag={(_, info) => {
          const newValue = map(value.get() + info.delta.x);
          value.set(newValue);
          ref.current!.value = String(newValue);
        }}
      >
        {icon}
      </motion.div>
      <input
        ref={ref}
        type={'number'}
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
