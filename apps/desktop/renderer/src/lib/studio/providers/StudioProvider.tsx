import { useRef, useEffect, type ReactNode, useState } from 'react';
import { createDocStore } from '../stores/docStore';
import { createEngineStore } from '../stores/engineStore';
import { createInteractionStore } from '../stores/interactionStore';
import { bindDocToEngine } from '../stores/bindDocToEngine';
import { StudioContext, type StudioStores } from '../hooks/useStudioStores';
import type { IProject } from '../types/project';
import { StudioErrorContext } from '../hooks/useStudioError';

export function StudioProvider({
  children,
  initialProject,
}: {
  children: ReactNode;
  initialProject: IProject;
}) {
  const [isError, setIsError] = useState(false);
  const storesRef = useRef<StudioStores | null>(null);
  const unbindRef = useRef<(() => void) | null>(null);
  const cleanedRef = useRef(false);

  if (!storesRef.current) {
    try {
      const docStore = createDocStore(initialProject);
      const engineStore = createEngineStore(() => docStore.getState());
      const interactionStore = createInteractionStore();

      storesRef.current = {
        docStore,
        engineStore,
        interactionStore,
      };
      console.log('=== [StudioProvider] 스토어 생성 완료. ===');
    } catch (e) {
      console.error('[StudioProvider] 스토어 생성 중 에러', e);
      setIsError(true);
    }
  }

  const safeCleanup = () => {
    /** 중복 클린업 방지 */
    if (cleanedRef.current) return;
    cleanedRef.current = true;

    unbindRef.current?.();
    storesRef.current?.engineStore.getState().destroy();
    storesRef.current = null;
    setIsError(false);
    console.log('=== [StudioProvider] 스토어 정리 완료. ===');
  };

  useEffect(() => {
    (async () => {
      if (!storesRef.current) {
        throw new Error('Stores not initialized');
      }
      const { docStore, engineStore } = storesRef.current;
      try {
        const unbind = await bindDocToEngine(docStore, engineStore);
        unbindRef.current = unbind;
        console.log('=== [Binding] Doc-Engine 바인딩 완료. ===');
      } catch (e) {
        console.error('[Binding] Doc-Engine 바인딩 중 에러', e);
        setIsError(true);
      }
    })();

    /** 개발 환환경일 때 새로고침 시 store 라이프사이클 관리*/
    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        safeCleanup();
      });
    }
    return () => {
      safeCleanup();
    };
  }, []);

  return (
    <StudioContext.Provider value={storesRef.current}>
      <StudioErrorContext.Provider value={isError}>
        {children}
      </StudioErrorContext.Provider>
    </StudioContext.Provider>
  );
}
