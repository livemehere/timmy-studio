import { useRef, useEffect, type ReactNode } from 'react';
import { createDocStore } from '../stores/docStore';
import { createEngineStore } from '../stores/engineStore';
import { createInteractionStore } from '../stores/interactionStore';
import { bindDocToEngine } from '../stores/bindDocToEngine';
import { StudioContext, type StudioStores } from '../hooks/useStudioStores';
import type { IProject } from '../types/project';

export function StudioProvider({
  children,
  initialProject,
}: {
  children: ReactNode;
  initialProject: IProject;
}) {
  const storesRef = useRef<StudioStores | null>(null);
  const unbindRef = useRef<(() => void) | null>(null);

  if (!storesRef.current) {
    const docStore = createDocStore(initialProject);
    const engineStore = createEngineStore(() => docStore.getState());
    const interactionStore = createInteractionStore();

    storesRef.current = {
      docStore,
      engineStore,
      interactionStore,
    };

    unbindRef.current = bindDocToEngine(docStore, engineStore);
  }

  useEffect(() => {
    return () => {
      unbindRef.current?.();
      storesRef.current?.engineStore.getState().destroy();
    };
  }, []);

  return (
    <StudioContext.Provider value={storesRef.current}>
      {children}
    </StudioContext.Provider>
  );
}
