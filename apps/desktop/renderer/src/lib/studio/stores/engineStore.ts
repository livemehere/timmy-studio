import { createStore } from 'zustand/vanilla';
import { Timer } from '../core/Timer';
import { Renderer } from '../core/Renderer';
import { AudioManager } from '../core/AudioManager';
import { AssetManager } from '../core/AssetManager';
import type { IProject, IVideoTrack } from '../types';

export interface EngineState {
  // Engine instances (런타임 인스턴스 소유)
  timer: Timer | null;
  renderer: Renderer | null;
  audioManager: AudioManager | null;
  assetManager: AssetManager | null;

  // Lifecycle state
  isInitialized: boolean;
}

export interface EngineActions {
  // Initialization
  init: (project: IProject) => void;
  destroy: () => void;
}

export type EngineStore = EngineState & EngineActions;

export const createEngineStore = () => {
  console.debug('[EngineStore] createStore');
  return createStore<EngineStore>((set, get) => ({
    // Initial state
    timer: null,
    renderer: null,
    audioManager: null,
    assetManager: null,
    isInitialized: false,

    // Actions
    init: (project) => {
      const state = get();
      if (state.isInitialized) {
        console.debug('[EngineStore] init already, Skipping.');
        return;
      }

      console.debug('[EngineStore] init called');

      // Create engine instances
      const assetManager = new AssetManager(project.assets);
      const timer = new Timer(project.settings.duration);
      const renderer = new Renderer(timer, assetManager);
      const audioManager = new AudioManager(project.settings.sampleRate);

      // Load all assets, then sync tracks
      const videoTracks = project.tracks.filter(
        (track) => track.type === 'video'
      ) as IVideoTrack[];

      // 로드가 끝나면, track을 renderer 에서 인스턴스화
      assetManager.loadAllAssets(() => {
        renderer.syncTracks(videoTracks);
      });

      set({
        timer,
        renderer,
        audioManager,
        assetManager,
        isInitialized: true,
      });
    },

    destroy: () => {
      console.debug('[EngineStore] Destroying engine instances');

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

      if (state.assetManager) {
        state.assetManager.destroy();
      }

      // Reset state
      set({
        timer: null,
        renderer: null,
        audioManager: null,
        assetManager: null,
        isInitialized: false,
      });
    },
  }));
};
