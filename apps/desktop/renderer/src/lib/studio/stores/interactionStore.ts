import { createStore } from 'zustand/vanilla';

export interface InteractionState {
  selectedClipIds: string[];
}

export interface InteractionActions {
  setSelectedClipId: (clipId: string | null) => void;
  addSelectedClipId: (clipId: string) => void;
}

export type InteractionStore = InteractionState & InteractionActions;

export const createInteractionStore = () => {
  return createStore<InteractionStore>()((set, get) => ({
    selectedClipIds: [],

    setSelectedClipId: (clipId) => {
      set({ selectedClipIds: clipId ? [clipId] : [] });
    },

    addSelectedClipId: (clipId) => {
      const selectedClipIds = get().selectedClipIds;
      if (selectedClipIds.includes(clipId)) return;
      set({ selectedClipIds: [...selectedClipIds, clipId] });
    },
  }));
};
