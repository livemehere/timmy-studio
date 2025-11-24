import { createStore } from 'zustand/vanilla';
import { Timer } from '../core/Timer';
import { Renderer } from '../core/Renderer';
import { AudioManager } from '../core/AudioManager';
import { AssetManager } from '../core/AssetManager';
import type { IProject } from '../types';

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
  return createStore<EngineStore>((set, get) => ({
    // Initial state
    timer: null,
    renderer: null,
    audioManager: null,
    assetManager: null,
    isInitialized: false,

    // Actions
    init: (project) => {
      console.log('[EngineStore] Initializing engine instances');

      // Destroy existing instances if any
      const state = get();
      if (state.isInitialized) {
        state.destroy();
      }

      // Create new instances
      const assetManager = new AssetManager(project.assets);
      const timer = new Timer(project.settings.duration);
      const renderer = new Renderer(
        project.tracks.filter((track) => track.type === 'video'),
        timer,
        assetManager
      );
      const audioManager = new AudioManager();

      // Initialize renderer settings
      renderer.resize(project.settings.width, project.settings.height);
      renderer.background = project.settings.background;
      renderer.frameRate = project.settings.frameRate;

      // Initialize audio manager
      audioManager.sampleRate = project.settings.sampleRate;

      set({
        timer,
        renderer,
        audioManager,
        assetManager,
        isInitialized: true,
      });
    },

    destroy: () => {
      console.log('[EngineStore] Destroying engine instances');

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
