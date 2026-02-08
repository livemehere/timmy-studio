import { create } from 'zustand';
import { devtoolsRegistry } from './registry';

export interface DevtoolsState {
  isOpen: boolean;
  selectedStore: string | null;
  stores: { name: string }[];
  setStores: (stores: { name: string }[]) => void;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setSelectedStore: (name: string | null) => void;
}

export const useDevtoolsStore = create<DevtoolsState>((set) => ({
  isOpen: false,
  selectedStore: null,
  stores: [],
  setStores: (stores) => set({ stores }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setSelectedStore: (name) => set({ selectedStore: name }),
}));
