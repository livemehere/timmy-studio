import { useRef } from 'react';
import { useMountRenderer } from '@/lib/studio/hooks/useMountRenderer';

export function PreviewRenderer() {
  const parentRef = useRef<HTMLDivElement | null>(null);
  useMountRenderer(parentRef);

  return (
    <div className="relative w-full h-[calc(100%-40px)] flex items-center justify-center">
      <div
        ref={parentRef}
        className="w-full h-full flex items-center justify-center"
      ></div>
    </div>
  );
}
