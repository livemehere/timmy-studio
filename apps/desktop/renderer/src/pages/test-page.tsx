import { MotionNumberInput } from '@/lib/motion-input';
import {
  motion,
  useAnimate,
  useMotionValue,
  useMotionValueEvent,
} from 'motion/react';
import { useRef } from 'react';

export default function TestPage() {
  const [scope, animate] = useAnimate();

  const ref = useRef<HTMLDivElement>(null);
  const v = useMotionValue(0);
  useMotionValueEvent(v, 'change', (value) => {
    ref.current!.textContent = `${value.toFixed(2)}`;
  });
  return (
    <div className="h-full w-full flex flex-col gap-4 items-center justify-center bg-neutral-950">
      <div>
        <motion.div
          ref={ref}
          style={{
            position: 'relative',
            width: 100,
            height: 100,
            backgroundColor: 'red',
            x: v,
          }}
          className="div"
        >
          {v.get()}
        </motion.div>
      </div>
      <MotionNumberInput
        className="w-[250px]"
        value={v}
        icon={<div>V</div>}
        step={5}
        sensitivity={0.1}
        min={100}
        max={200}
        onCommit={() => {
          animate(
            ref.current!,
            {
              backgroundColor: ['#ff0000', '#ffffff', '#ff0000'],
            },
            {
              duration: 0.3,
            }
          );
        }}
      />
      <button onClick={() => v.set(v.get() + 10)}>Add + 10</button>
    </div>
  );
}
