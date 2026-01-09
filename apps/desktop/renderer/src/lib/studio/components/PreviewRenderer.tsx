import { useRef } from 'react';
import { useDocStore } from '../hooks/useStudioStores';
import { cn } from '@/lib/utils';
import { useBindRenderer } from '@/lib/studio/hooks/useBindRenderer';

export function PreviewRenderer() {
  const settings = useDocStore((state) => state.settings);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useBindRenderer(canvasRef);

  return (
    <div className="relative w-full h-[calc(100%-40px)] flex items-center justify-center">
      {/*<div*/}
      {/*  className={*/}
      {/*    'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-shadow-lg text-shadow-blue-600/50'*/}
      {/*  }*/}
      {/*>*/}
      {/*  {settings.width} x {settings.height}*/}
      {/*</div>*/}
      <canvas
        ref={canvasRef}
        className={cn({
          'w-full h-auto': settings.width >= settings.height,
          'w-auto h-full': settings.width < settings.height,
        })}
      ></canvas>
    </div>
  );
}
