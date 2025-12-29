import { createStore } from 'zustand/vanilla';

export interface InteractionState {
  selectedClipIds: string[];
}

export interface InteractionActions {
  setSelectedClipId: (clipId: string | null) => void;
  addSelectedClipId: (clipId: string) => void;
  removeSelectedClipId: (clipId: string) => void;
}

export type InteractionStore = InteractionState & InteractionActions;

/**
 * 사용자 인터렉션으로 값을 제어할 때 delta 값을 저장하여, 상태 변화를 추적하는 스토어
 */
export const createInteractionStore = () => {
  console.log('[InteractionStore] Interaction 스토어 생성됨.');
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

    removeSelectedClipId: (clipId) => {
      const selectedClipIds = get().selectedClipIds;
      set({ selectedClipIds: selectedClipIds.filter((id) => id !== clipId) });
    },
  }));
};
