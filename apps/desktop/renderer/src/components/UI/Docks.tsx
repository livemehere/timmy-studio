import {
  AnimatePresence,
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import { useRef, useState } from 'react';

interface IDockItemProps {
  id: string;
  label: string;
  icon: React.ReactElement;
  onClick: () => void;

  // inner
  mouseX: MotionValue<number>;
  distance: number;
  baseSize: number;
  maximumSize: number;
}

export type TDockItem = Pick<
  IDockItemProps,
  'id' | 'label' | 'icon' | 'onClick'
>;

function DockItem({
  id,
  label,
  icon,
  onClick,
  mouseX,
  distance,
  baseSize,
  maximumSize,
}: IDockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mouseDistance = useTransform(mouseX, (v) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return Infinity;
    const itemCenterX = rect.left + rect.width / 2;
    return v - itemCenterX;
  });

  const size = useSpring(
    useTransform(
      mouseDistance,
      [-distance, 0, distance],
      [baseSize, maximumSize, baseSize]
    ),
    { mass: 0.1, stiffness: 150, damping: 12 }
  );

  return (
    <motion.div
      ref={ref}
      key={id}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{
        background: '#d2d2d2',
      }}
      transition={{
        background: {
          duration: 0.3,
          ease: 'easeInOut',
        },
      }}
      className="flex flex-col items-center justify-center border border-neutral-600 rounded-lg cursor-pointer"
      style={{
        width: size,
        height: size,
        background: '#0a0a0a', // bg-neutral-950 equivalent
      }}
    >
      {icon}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded border border-neutral-700 whitespace-nowrap"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Docks({
  items,
  distance = 200,
  baseSize = 40,
  maximumSize = 55,
}: {
  items: TDockItem[];
  distance?: number;
  baseSize?: number;
  maximumSize?: number;
}) {
  const mouseX = useMotionValue(Infinity);
  return (
    <motion.div
      className="flex items-end gap-2 p-2 bg-neutral-900 rounded-lg border border-neutral-700/20"
      onPointerMove={(e) => {
        mouseX.set(e.clientX);
      }}
      onPointerLeave={() => {
        mouseX.set(Infinity);
      }}
    >
      {items.map((item) => (
        <DockItem
          key={item.id}
          {...item}
          mouseX={mouseX}
          distance={distance}
          baseSize={baseSize}
          maximumSize={maximumSize}
        />
      ))}
    </motion.div>
  );
}
