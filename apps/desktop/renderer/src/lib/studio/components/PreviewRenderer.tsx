import { useEffect, useRef } from 'react';
import { useStudio } from '../contexts/StudioProvider';
import { useObservable } from '@renderer/lib/studio/hooks/useObservable';
import { cn } from '@renderer/utils/cn';

export function PreviewRenderer() {
  const studio = useStudio();
  const size = useObservable(
    studio.settings$,
    {
      w: studio.settings$.value.width,
      h: studio.settings$.value.height,
    },
    (p) => ({
      w: p.width,
      h: p.height,
    })
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const { width, height, background } = studio.settings$.value;
    studio.renderer.init(canvasRef.current!, width, height, background);
    return () => {
      studio.renderer.destroy();
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className={
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-shadow-lg text-shadow-blue-600/50'
        }
      >
        {size.w} x {size.h}
      </div>
      <canvas
        ref={canvasRef}
        className={cn({
          'w-full h-auto': size.w >= size.h,
          'w-auto h-full': size.w < size.h,
        })}
      ></canvas>
    </div>
  );
}
