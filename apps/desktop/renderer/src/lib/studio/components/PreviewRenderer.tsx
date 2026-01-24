import { useRef } from 'react';
import { useBindRenderer } from '@/lib/studio/hooks/useBindRenderer';

export function PreviewRenderer() {
  const parentRef = useRef<HTMLDivElement | null>(null);
  useBindRenderer(parentRef);

  return (
    <div className="relative w-full h-[calc(100%-40px)] flex items-center justify-center">
      <div
        ref={parentRef}
        className="w-full h-full flex items-center justify-center"
      ></div>
    </div>
  );
}
