import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';
import type { DocStore } from '../stores/docStore';
import type { EngineStore } from '../stores/engineStore';
import type { InteractionStore } from '../stores/interactionStore';

export interface StudioStores {
  docStore: StoreApi<DocStore>;
  engineStore: StoreApi<EngineStore>;
  interactionStore: StoreApi<InteractionStore>;
}

export const StudioContext = createContext<StudioStores | null>(null);
StudioContext.displayName = 'StudioContext';

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

export function useInteractionStore<T>(
  selector: (state: InteractionStore) => T
): T {
  const { interactionStore } = useStudioStores();
  return useStore(interactionStore, selector);
}
