import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';
import type { DocStore } from '../stores/docStore';
import type { EngineStore } from '../stores/engineStore';

export interface StudioStores {
  docStore: StoreApi<DocStore>;
  engineStore: StoreApi<EngineStore>;
}

export const StudioContext = createContext<StudioStores | null>(null);

export function useStudioStores(): StudioStores {
  const stores = useContext(StudioContext);
  if (!stores) {
    throw new Error('useStudioStores must be used within a StudioProvider');
  }
  return stores;
}

export function useDocStore<T>(selector: (state: DocStore) => T): T {
  const { docStore } = useStudioStores();
  return useStore(docStore, selector);
}

export function useEngineStore<T>(selector: (state: EngineStore) => T): T {
  const { engineStore } = useStudioStores();
  return useStore(engineStore, selector);
}
