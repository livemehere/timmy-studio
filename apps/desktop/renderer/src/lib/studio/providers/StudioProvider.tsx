import { useRef, useEffect, type ReactNode, useState } from 'react';
import { createDocStore } from '../stores/docStore';
import { createEngineStore } from '../stores/engineStore';
import { createInteractionStore } from '../stores/interactionStore';
import { bindDocToEngine } from '../stores/bindDocToEngine';
import { StudioContext, type StudioStores } from '../hooks/useStudioStores';
import type { IProject } from '../types/project';
import { StudioErrorContext } from '../hooks/useStudioError';
import { Spinner } from '@/components/ui/spinner';

export function StudioProvider({
  children,
  initialProject,
}: {
  children: ReactNode;
  initialProject: IProject;
}) {
  const storesRef = useRef<StudioStores | null>(null);
  const unbindRef = useRef<(() => void) | null>(null);
  const cleanedRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isError, setIsError] = useState(false);

  /** ---------- cleanup (idempotent) ---------- */
  const cleanup = () => {
    if (cleanedRef.current) return;
    cleanedRef.current = true;

    try {
      unbindRef.current?.();
      storesRef.current?.engineStore.getState().destroy();
    } catch (e) {
      console.error('[StudioProvider] cleanup error', e);
    } finally {
      unbindRef.current = null;
      storesRef.current = null;
    }

    console.log('=== [StudioProvider] 스토어 정리 완료 ===');
  };

  /** ---------- store 생성 ---------- */
  useEffect(() => {
    cleanedRef.current = false;

    try {
      const docStore = createDocStore(initialProject);
      const engineStore = createEngineStore(() => docStore.getState());
      const interactionStore = createInteractionStore();

      storesRef.current = {
        docStore,
        engineStore,
        interactionStore,
      };

      console.log('=== [StudioProvider] 스토어 생성 완료 ===');
    } catch (e) {
      console.error('[StudioProvider] 스토어 생성 실패', e);
      setIsError(true);
      return;
    }

    return () => {
      cleanup();
    };
  }, [initialProject]);

  /** ---------- binding ---------- */
  useEffect(() => {
    if (!storesRef.current) return;
    if (isError) return;

    let cancelled = false;

    (async () => {
      try {
        const { docStore, engineStore } = storesRef.current!;
        const unbind = await bindDocToEngine(docStore, engineStore);

        if (cancelled) {
          unbind();
          return;
        }

        unbindRef.current = unbind;
        setIsReady(true);

        console.log('=== [Binding] Doc-Engine 바인딩 완료 ===');
      } catch (e) {
        console.error('[Binding] Doc-Engine 바인딩 실패', e);
        setIsError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isError]);

  /** ---------- HMR 대응 ---------- */
  useEffect(() => {
    if (!import.meta.hot) return;

    import.meta.hot.dispose(() => {
      cleanup();
    });
  }, []);

  /** ---------- render ---------- */
  if (isError) {
    return (
      <StudioErrorContext.Provider value={true}>
        {children}
      </StudioErrorContext.Provider>
    );
  }

  if (!isReady || !storesRef.current) {
    return (
      <div className="w-full h-full flex items-center justify-center select-none">
        <Spinner />
      </div>
    );
  }

  return (
    <StudioContext.Provider value={storesRef.current}>
      <StudioErrorContext.Provider value={false}>
        {children}
      </StudioErrorContext.Provider>
    </StudioContext.Provider>
  );
}
