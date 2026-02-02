import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

export function GradientScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const update = () => {
    const el = scrollRef.current;
    if (!el) return;

    setShowLeft(el.scrollLeft > 0);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth);
  };

  useEffect(() => {
    update();
  }, []);
  return (
    <div className="relative">
      {showLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-7 bg-linear-to-r from-neutral-950" />
      )}
      {showRight && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-7 bg-linear-to-l from-neutral-950" />
      )}
      <div
        ref={scrollRef}
        onScroll={update}
        className={cn('shrink-0 overflow-x-auto scrollbar-4', className)}
      >
        {children}
      </div>
    </div>
  );
}
