import { createContext, useRef, useContext } from 'react';
import { createStore, useStore, type ExtractState } from 'zustand';

export interface IStudioStore {
  cnt: number;
  add: () => void;
}

const createStudioStore = () => {
  return createStore<IStudioStore>((set) => ({
    cnt: 0,
    add: () => set((state) => ({ cnt: state.cnt + 1 })),
  }));
};

export type TStudioStoreApi = ReturnType<typeof createStudioStore>;

const StudioContext = createContext<TStudioStoreApi>({} as TStudioStoreApi);

export function StudioStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<TStudioStoreApi>({} as TStudioStoreApi);
  if (!storeRef.current) {
    storeRef.current = createStudioStore();
  }
  return (
    <StudioContext.Provider value={storeRef.current}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudioStore<T>(
  selector: (state: ExtractState<TStudioStoreApi>) => T
): T {
  const store = useContext(StudioContext);
  if (!store) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return useStore(store, selector);
}
