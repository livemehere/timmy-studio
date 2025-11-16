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

  return (
    <div className="w-full h-[500px] border border-gray-300">
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
    </div>
  );
}
