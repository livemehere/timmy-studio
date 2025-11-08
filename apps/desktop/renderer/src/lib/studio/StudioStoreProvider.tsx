import { createContext, useRef, useContext } from 'react';
import { createStore, useStore, type ExtractState } from 'zustand';

export interface IStudioStore {}

const createStudioStore = () => {
  return createStore<IStudioStore>((set) => ({}));
};

export type TStudioStoreApi = ReturnType<typeof createStudioStore>;

const StudioContext = createContext<TStudioStoreApi>(
  null as unknown as TStudioStoreApi
);

export function StudioStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeApiRef = useRef<TStudioStoreApi | null>(null);
  if (!storeApiRef.current) {
    storeApiRef.current = createStudioStore();
  }
  return (
    <StudioContext.Provider value={storeApiRef.current}>
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
