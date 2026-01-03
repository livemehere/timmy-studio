import { Timer } from '../engine/Timer';
import { Renderer } from '../engine/Renderer';
import { type DocGetter } from '../engine/types';
import { AudioRenderer } from '../engine/AudioRenderer';
import { createStore } from 'zustand/vanilla';

export interface EngineState {
  // Engine instances (런타임 인스턴스 소유)
  timer: Timer | null;
  renderer: Renderer | null;
  audioRenderer: AudioRenderer | null;

  // Lifecycle state
  isInitialized: boolean;

  // Renderer sync state (Pixi 객체 접근용)
  isRendererReady: boolean;
  syncedGraphicTrackIds: string[];
  syncedGraphicClipIds: string[];

  // AudioManager sync state (Audio 객체 접근용)
  // TODO: AudioRenderer 구현 완료 후 사용
  isAudioReady: boolean;
  syncedAudioTrackIds: string[];
  syncedAudioClipIds: string[];
}

export interface EngineActions {
  destroy: () => void;

  setRendererReady: (ready: boolean) => void;
  setAudioReady: (ready: boolean) => void;

  applyRendererSyncResult: (payload: {
    trackIds: string[];
    clipIds: string[];
  }) => void;
  applyAudioSyncResult: (payload: {
    trackIds: string[];
    clipIds: string[];
  }) => void;
}

export type EngineStore = EngineState & EngineActions;

export const createEngineStore = (docGetter: DocGetter) => {
  console.group('[EngineStore] Engine 스토어 생성됨.');

  const initialProject = docGetter();
  const timer = new Timer(initialProject.settings.duration);
  const renderer = new Renderer(timer, docGetter);
  const audioRenderer = new AudioRenderer(timer, docGetter);

  // Timer가 seek 제어를 할 때 Renderer의 seek 처리 완료를 대기하도록 설정
  timer.setSeekWaiter((ms) => renderer.waitForSeekSettled(ms));

  // AudioRenderer는 내부적으로 Timer를 구독하여 동작하므로 별도 연결 불필요
  // renderer.addTickListener((ctx) => {
  //   audioRenderer.tick(ctx);
  // });

  console.groupEnd();

  return createStore<EngineStore>()((set, get) => ({
    timer,
    renderer,
    audioRenderer,
    isInitialized: true,

    // Renderer sync state
    isRendererReady: true,
    syncedGraphicTrackIds: [],
    syncedGraphicClipIds: [],

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

      if (state.audioRenderer) {
        state.audioRenderer.destroy();
      }

      // Cleanup timer
      if (state.timer) {
        state.timer.destroy();
      }

      // Reset state
      set({
        timer: null,
        renderer: null,
        audioRenderer: null,
        isInitialized: false,
        isRendererReady: false,
        syncedGraphicTrackIds: [],
        syncedGraphicClipIds: [],
        isAudioReady: false,
        syncedAudioTrackIds: [],
        syncedAudioClipIds: [],
      });
    },

    setRendererReady: (ready) => {
      set({ isRendererReady: ready });
    },

    setAudioReady: (ready) => {
      set({ isAudioReady: ready });
    },

    applyRendererSyncResult: ({ trackIds, clipIds }) => {
      set({
        syncedGraphicTrackIds: trackIds,
        syncedGraphicClipIds: clipIds,
      });
    },

    applyAudioSyncResult: ({ trackIds, clipIds }) => {
      set({
        syncedAudioTrackIds: trackIds,
        syncedAudioClipIds: clipIds,
      });
    },
  }));
};
