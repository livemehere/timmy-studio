import { useEffect, useRef } from 'react';
import { useStudio } from '../StudioProvider';

export function PreviewRenderer() {
  const studio = useStudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    console.log('preview render');
  });

  useEffect(() => {
    studio.initRenderer({
      canvas: canvasRef.current!,
    });

    return () => {
      studio.destroyRenderer();
    };
  }, []);

  return (
    <div className="w-full h-[500px] border border-gray-300">
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
    </div>
  );
}
