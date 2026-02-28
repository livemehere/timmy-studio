import { createStore } from 'zustand/vanilla';
import type { IClip, ClipType } from '../domains/Clip/types';

export interface ClipboardItem {
  clip: IClip; // 클립 전체 데이터 (JSON 복사본)
  trackId: string; // 원본 트랙 ID
  relativeStartTime: number; // 첫 번째 클립 대비 상대 시간
}

export interface ClipboardData {
  clips: ClipboardItem[]; // 여러 클립 지원
  operation: 'copy' | 'cut';
}

/**
 * 클립 속성 복사/붙여넣기용 클립보드.
 * 콘텐츠(텍스트 내용, 에셋 ID 등)를 제외한 스타일 속성만 저장.
 */
export interface StyleClipboardData {
  sourceType: ClipType;
  style: Record<string, unknown>;
}

export interface InteractionState {
  selectedClipIds: string[];
  draggingClipId: string | null;
  activeTrackId: string | null; // 현재 활성화된 트랙 ID
  clipboard: ClipboardData | null;
  styleClipboard: StyleClipboardData | null; // 속성 복사용
  lastClickedTime: number | null; // 트랙 클릭 시 시간 위치 (ms)
  exportPreviewRange: { start: number; end: number } | null; // Export 다이얼로그 열릴 때 범위 표시
}

export interface InteractionActions {
  setSelectedClipId: (clipId: string | null) => void;
  setSelectedClipIds: (clipIds: string[]) => void;
  addSelectedClipId: (clipId: string) => void;
  removeSelectedClipId: (clipId: string) => void;

  setDraggingClipId: (clipId: string | null) => void;
  setActiveTrackId: (trackId: string | null) => void;
  setClipboard: (data: ClipboardData | null) => void;
  setStyleClipboard: (data: StyleClipboardData | null) => void;
  setLastClickedTime: (time: number | null) => void;
  setExportPreviewRange: (range: { start: number; end: number } | null) => void;
}

export type InteractionStore = InteractionState & InteractionActions;

/**
 * 사용자 인터렉션으로 값을 제어할 때 delta 값을 저장하여, 상태 변화를 추적하는 스토어
 */
export const createInteractionStore = () => {
  console.log('[InteractionStore] 스토어 생성됨.');
  return createStore<InteractionStore>()((set, get) => ({
    selectedClipIds: [],
    draggingClipId: null,
    activeTrackId: null,
    clipboard: null,
    styleClipboard: null,
    lastClickedTime: null,
    exportPreviewRange: null,

    setSelectedClipId: (clipId) => {
      set({ selectedClipIds: clipId ? [clipId] : [] });
    },

    setSelectedClipIds: (clipIds) => {
      set({ selectedClipIds: clipIds });
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

    setDraggingClipId: (clipId) => {
      set({ draggingClipId: clipId });
    },

    setActiveTrackId: (trackId) => {
      set({ activeTrackId: trackId });
    },

    setClipboard: (data) => {
      set({ clipboard: data });
    },

    setStyleClipboard: (data) => {
      set({ styleClipboard: data });
    },

    setLastClickedTime: (time) => {
      set({ lastClickedTime: time });
    },

    setExportPreviewRange: (range) => {
      set({ exportPreviewRange: range });
    },
  }));
};
