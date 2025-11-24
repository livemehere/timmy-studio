import { createContext, useRef, useContext, useEffect } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';
import type { IProject } from '../types';
import { createDocStore, type DocStore } from '../stores/docStore';
import { createEngineStore, type EngineStore } from '../stores/engineStore';
import { bindDocToEngine } from '../stores/bindDocToEngine';

interface StudioStores {
  docStore: StoreApi<DocStore>;
  engineStore: StoreApi<EngineStore>;
}

const StudioContext = createContext<StudioStores | null>(null);

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
    console.log('[StudioProvider] Creating stores');
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
      console.log('[StudioProvider] Loading project');
      storesRef.current.docStore.getState().loadProject(initialProject);
      storesRef.current.engineStore.getState().init(initialProject);
    }
  }, [initialProject]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[StudioProvider] Cleaning up');
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

function useStudioStores(): StudioStores {
  const stores = useContext(StudioContext);
  if (!stores) {
    throw new Error('useStudioStores must be used within a StudioProvider');
  }
  return stores;
}

/**
 * docStore에 접근하는 hook
 * @example
 * const tracks = useDocStore((state) => state.tracks);
 * const addTrack = useDocStore((state) => state.addTrack);
 */
export function useDocStore<T>(selector: (state: DocStore) => T): T {
  const { docStore } = useStudioStores();
  return useStore(docStore, selector);
}

/**
 * engineStore에 접근하는 hook
 * @example
 * const renderer = useEngineStore((state) => state.renderer);
 */
export function useEngineStore<T>(selector: (state: EngineStore) => T): T {
  const { engineStore } = useStudioStores();
  return useStore(engineStore, selector);
}

/**
 * 개별 track을 id 기반으로 선택하는 hook (리렌더 최소화)
 */
export function useTrack(trackId: string) {
  return useDocStore((state) =>
    state.tracks.find((track) => track.id === trackId)
  );
}

/**
 * 개별 asset을 id 기반으로 선택하는 hook (리렌더 최소화)
 */
export function useAsset(assetId: string) {
  return useDocStore((state) =>
    state.assets.find((asset) => asset.id === assetId)
  );
}
