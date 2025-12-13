import { type RefObject, useEffect } from 'react';
import { useEngineStore } from '@renderer/lib/studio/hooks/useStudioStores';

export function useBindRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>
) {
  const renderer = useEngineStore((state) => state.renderer);

  useEffect(() => {
    if (!renderer || !canvasRef.current) return;

    renderer.init(canvasRef.current).catch((e) => {
      console.error('[PreviewRenderer] renderer init error', e);
    });
    return () => {
      renderer.destroy();
    };
  }, [renderer]);
}
