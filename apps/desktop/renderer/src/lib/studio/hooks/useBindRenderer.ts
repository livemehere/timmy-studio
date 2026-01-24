import { type RefObject, useEffect } from 'react';
import { useEngineStore } from '@/lib/studio/hooks/useStudioStores';

export function useBindRenderer(parentRef: RefObject<HTMLDivElement | null>) {
  const renderer = useEngineStore((state) => state.renderer);
  const audioRenderer = useEngineStore((state) => state.audioRenderer);
  const setAudioReady = useEngineStore((state) => state.setAudioReady);

  useEffect(() => {
    if (!renderer || !parentRef.current) return;

    renderer.init(parentRef.current).catch((e: unknown) => {
      console.error('[PreviewRenderer] renderer init error', e);
    });
    return () => {
      renderer.destroy();
    };
  }, [renderer]);

  // AudioRenderer init
  useEffect(() => {
    if (!audioRenderer) return;

    audioRenderer
      .init()
      .then(() => {
        console.log('[AudioRenderer] Initialized successfully');
        setAudioReady(true);
      })
      .catch((e: unknown) => {
        console.error('[AudioRenderer] init error', e);
        setAudioReady(false);
      });

    return () => {
      setAudioReady(false);
    };
  }, [audioRenderer, setAudioReady]);
}
