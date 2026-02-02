import { cn } from '@/lib/utils';
import { useLayoutEffect, useRef, useState } from 'react';

type Dir = 'horizontal' | 'vertical';

export function GradientScroll({
  children,
  className,
  dir = 'horizontal',
  size = 20,
}: {
  children: React.ReactNode;
  className?: string;
  dir?: Dir;
  size?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const isHorizontal = dir === 'horizontal';

  const update = () => {
    const el = scrollRef.current;
    if (!el) return;

    if (isHorizontal) {
      setShowStart(el.scrollLeft > 0);
      setShowEnd(el.scrollLeft + el.clientWidth < el.scrollWidth);
    } else {
      setShowStart(el.scrollTop > 0);
      setShowEnd(el.scrollTop + el.clientHeight < el.scrollHeight);
    }
  };

  // 최초 레이아웃 확정
  useLayoutEffect(() => {
    update();
  }, []);

  // 사이즈 / 컨텐츠 변화 감지
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative">
      {/* start gradient */}
      {showStart && (
        <div
          className={cn(
            'pointer-events-none absolute',
            isHorizontal
              ? 'left-0 top-0 bottom-0 bg-linear-to-r from-neutral-950'
              : 'top-0 left-0 right-0 bg-linear-to-b from-neutral-950'
          )}
          style={isHorizontal ? { width: size } : { height: size }}
        />
      )}

      {/* end gradient */}
      {showEnd && (
        <div
          className={cn(
            'pointer-events-none absolute',
            isHorizontal
              ? 'right-0 top-0 bottom-0 bg-linear-to-l from-neutral-950'
              : 'bottom-0 left-0 right-0 bg-linear-to-t from-neutral-950'
          )}
          style={isHorizontal ? { width: size } : { height: size }}
        />
      )}

      <div
        ref={scrollRef}
        onScroll={update}
        className={cn(
          'shrink-0 scrollbar-2',
          isHorizontal ? 'overflow-x-auto' : 'overflow-y-auto',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
