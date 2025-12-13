import { Timer } from '../core/Timer';
import { type DocGetter, Renderer } from '../core/Renderer';
import { AudioManager } from '../core/AudioManager';
import { createStore } from 'zustand/vanilla';

export interface EngineState {
  // Engine instances (런타임 인스턴스 소유)
  timer: Timer | null;
  renderer: Renderer | null;
  audioManager: AudioManager | null;

  // Lifecycle state
  isInitialized: boolean;

  // Renderer sync state (Pixi 객체 접근용)
  isRendererReady: boolean;
  syncedVideoTrackIds: string[];
  syncedVideoClipIds: string[];

  // AudioManager sync state (Audio 객체 접근용)
  // TODO: AudioManager 구현 완료 후 사용
  isAudioReady: boolean;
  syncedAudioTrackIds: string[];
  syncedAudioClipIds: string[];
}

export interface EngineActions {
  // Destruction
  destroy: () => void;

  // Renderer sync state management
  setRendererReady: (ready: boolean) => void;
  setSyncedTrackIds: (trackIds: string[]) => void;
  setSyncedClipIds: (clipIds: string[]) => void;

  // AudioManager sync state management
  // TODO: AudioManager 구현 완료 후 사용
  setAudioReady: (ready: boolean) => void;
  setSyncedAudioTrackIds: (trackIds: string[]) => void;
  setSyncedAudioClipIds: (clipIds: string[]) => void;
}

export type EngineStore = EngineState & EngineActions;

export const createEngineStore = (docGetter: DocGetter) => {
  console.group('[EngineStore] Engine 스토어 생성됨.');

  const project = docGetter();
  const timer = new Timer(project.settings.duration);
  const renderer = new Renderer(timer, docGetter);
  const audioManager = new AudioManager(project.settings.sampleRate);

  timer.setSeekWaiter((ms) => renderer.waitForSeekSettled(ms));

  console.groupEnd();

  return createStore<EngineStore>()((set, get) => ({
    timer,
    renderer,
    audioManager,
    isInitialized: true,

    // Renderer sync state
    isRendererReady: true,
    syncedVideoTrackIds: [],
    syncedVideoClipIds: [],

    // AudioManager sync state
    isAudioReady: true,
    syncedAudioTrackIds: [],
    syncedAudioClipIds: [],

    // ...existing code...

    destroy: () => {
      console.log('[EngineStore] destroy 호출됨. 엔진을 정리합니다.');

      const state = get();

      // Cleanup renderer
      if (state.renderer) {
        state.renderer.destroy();
      }

      if (state.audioManager) {
        state.audioManager.destroy();
      }

      // Cleanup timer
      if (state.timer) {
        state.timer.destroy();
      }

      // Reset state
      set({
        timer: null,
        renderer: null,
        audioManager: null,
        isInitialized: false,
        isRendererReady: false,
        syncedVideoTrackIds: [],
        syncedVideoClipIds: [],
        isAudioReady: false,
        syncedAudioTrackIds: [],
        syncedAudioClipIds: [],
      });
    },

    // Renderer sync state management
    setRendererReady: (ready) => {
      set({ isRendererReady: ready });
    },

    setSyncedTrackIds: (trackIds) => {
      set({ syncedVideoTrackIds: trackIds });
    },

    setSyncedClipIds: (clipIds) => {
      set({ syncedVideoClipIds: clipIds });
    },

    // AudioManager sync state management
    // TODO: AudioManager 구현 완료 후 사용
    setAudioReady: (ready) => {
      set({ isAudioReady: ready });
    },

    setSyncedAudioTrackIds: (trackIds) => {
      set({ syncedAudioTrackIds: trackIds });
    },

    setSyncedAudioClipIds: (clipIds) => {
      set({ syncedAudioClipIds: clipIds });
    },
  }));
};
