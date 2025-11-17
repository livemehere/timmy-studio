import { useEffect, useRef } from 'react';
import { useStudio } from '../contexts/StudioProvider';

export function PreviewRenderer() {
  const studio = useStudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const { width, height, backgroundColor } = studio.settings;
    studio.renderer.init(canvasRef.current!, width, height, backgroundColor);
    return () => {
      studio.renderer.destroy();
    };
  }, []);

  // 가로형인지 세로형인지 판단
  const isLandscape = studio.settings.width >= studio.settings.height;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className={`border border-amber-50 ${
          isLandscape ? 'w-full h-auto' : 'w-auto h-full'
        }`}
      ></canvas>
    </div>
  );
}
