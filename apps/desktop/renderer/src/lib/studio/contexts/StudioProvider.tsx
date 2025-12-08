import { useRef, useEffect } from 'react';
import type { IProject } from '../types/types';
import { createDocStore } from '../stores/docStore';
import { createEngineStore } from '../stores/engineStore';
import { bindDocToEngine } from '../stores/bindDocToEngine';
import { StudioContext, type StudioStores } from '../hooks/useStudioStores';

export function StudioProvider({
  children,
  initialProject,
}: {
  children: React.ReactNode;
  initialProject: IProject;
}) {
  const storesRef = useRef<StudioStores | null>(null);
  const unbindRef = useRef<(() => void) | null>(null);

  // Initialize stores once
  if (!storesRef.current) {
    const docStore = createDocStore(initialProject);
    const engineStore = createEngineStore();

    storesRef.current = {
      docStore,
      engineStore,
    };

    // Initialize engine with project
    engineStore.getState().init(initialProject);

    // Bind doc changes to engine
    unbindRef.current = bindDocToEngine(docStore, engineStore);
  }

  // Update project when initialProject changes
  useEffect(() => {
    if (storesRef.current) {
      storesRef.current.docStore.getState().loadProject(initialProject);
      storesRef.current.engineStore.getState().init(initialProject);
    }
  }, [initialProject]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unbindRef.current) {
        unbindRef.current();
      }
      if (storesRef.current) {
        storesRef.current.engineStore.getState().destroy();
      }
    };
  }, []);

  return (
    <StudioContext.Provider value={storesRef.current}>
      {children}
    </StudioContext.Provider>
  );
}
