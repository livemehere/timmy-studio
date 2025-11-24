import { useEffect, useRef } from 'react';
import { useDocStore, useEngineStore } from '../contexts/StudioProvider';
import { cn } from '@renderer/utils/cn';

export function PreviewRenderer() {
  const settings = useDocStore((state) => state.settings);
  const renderer = useEngineStore((state) => state.renderer);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!renderer || !canvasRef.current) return;

    const { width, height, background, frameRate } = settings;
    renderer
      .init(canvasRef.current, width, height, background, frameRate)
      .catch((e) => {
        console.error('[PreviewRenderer] renderer init error', e);
      });
    return () => {
      renderer.destroy();
    };
  }, [renderer]);

  return (
    <div className="relative w-full h-[calc(100%-26px)] flex items-center justify-center">
      <div
        className={
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-shadow-lg text-shadow-blue-600/50'
        }
      >
        {settings.width} x {settings.height}
      </div>
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
