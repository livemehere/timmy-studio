import { type RefObject, useEffect } from 'react';
import { useEngineStore } from '@/lib/studio/hooks/useStudioStores';

export function useMountRenderer(parentRef: RefObject<HTMLDivElement | null>) {
  const renderer = useEngineStore((state) => state.renderer);
  const isRendererReady = useEngineStore((state) => state.isRendererReady);

  useEffect(() => {
    if (!renderer?.isInitialized || !parentRef.current || !isRendererReady)
      return;
    renderer.mount(parentRef.current);
  }, [renderer, isRendererReady]);
}
