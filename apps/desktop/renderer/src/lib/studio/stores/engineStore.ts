import { Timer } from '../core/Timer';
import { Renderer } from '../core/Renderer';
import { AudioManager } from '../core/AudioManager';
import type { IProject } from '../types/types';
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
  syncedTrackIds: string[];
  syncedClipIds: string[];

  // AudioManager sync state (Audio 객체 접근용)
  // TODO: AudioManager 구현 완료 후 사용
  isAudioReady: boolean;
  syncedAudioTrackIds: string[];
  syncedAudioClipIds: string[];
}

export interface EngineActions {
  // Initialization
  init: (project: IProject) => void;
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

export const createEngineStore = () => {
  console.debug('[EngineStore] createStore');
  return createStore<EngineStore>()((set, get) => ({
    // Initial state
    timer: null,
    renderer: null,
    audioManager: null,
    isInitialized: false,

    // Renderer sync state
    isRendererReady: false,
    syncedTrackIds: [],
    syncedClipIds: [],

    // AudioManager sync state
    isAudioReady: false,
    syncedAudioTrackIds: [],
    syncedAudioClipIds: [],

    // Actions
    init: (project) => {
      const state = get();
      if (state.isInitialized) {
        console.debug('[EngineStore] init already, Skipping.');
        return;
      }

      console.debug('[EngineStore] init called');

      // Note: project.assets is captured in closure and won't auto-update.
      // For real-time asset updates, the caller should pass a fresh getAsset function
      // or we rely on bindDocToEngine to manage tracks/clips changes.

      // Create engine instances
      const timer = new Timer(project.settings.duration);

      // Create Renderer with getAsset function that accesses project.assets snapshot
      const getAsset = <
        T extends
          import('../types/asset').IAsset = import('../types/asset').IAsset,
      >(
        assetId: string
      ): T | undefined => {
        return project.assets.find((a) => a.id === assetId) as T | undefined;
      };
      const renderer = new Renderer(timer, getAsset);

      const audioManager = new AudioManager(project.settings.sampleRate);

      const videoTracks = project.tracks.filter(
        (track) => track.type === 'video'
      );

      const audioTracks = project.tracks.filter(
        (track) => track.type === 'audio'
      );

      // Directly sync tracks (no asset loading needed anymore)
      renderer.syncTracks(videoTracks);
      audioManager.syncTracks(audioTracks);

      // Sync 완료 후 상태 업데이트 (Video)
      const trackIds = videoTracks.map((t) => t.id);
      const clipIds = videoTracks.flatMap((t) => t.clips.map((c) => c.id));

      // Sync 완료 후 상태 업데이트 (Audio)
      // TODO: AudioManager 구현 완료 후 실제 동작
      const audioTrackIds = audioTracks.map((t) => t.id);
      const audioClipIds = audioTracks.flatMap((t) => t.clips.map((c) => c.id));

      set({
        timer,
        renderer,
        audioManager,
        isInitialized: true,
        isRendererReady: true,
        syncedTrackIds: trackIds,
        syncedClipIds: clipIds,
        isAudioReady: true,
        syncedAudioTrackIds: audioTrackIds,
        syncedAudioClipIds: audioClipIds,
      });

      console.debug(
        `[EngineStore] Renderer synced - tracks: ${trackIds.length}, clips: ${clipIds.length}`
      );
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

      // Reset state
      set({
        timer: null,
        renderer: null,
        audioManager: null,
        isInitialized: false,
        isRendererReady: false,
        syncedTrackIds: [],
        syncedClipIds: [],
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
      set({ syncedTrackIds: trackIds });
    },

    setSyncedClipIds: (clipIds) => {
      set({ syncedClipIds: clipIds });
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
