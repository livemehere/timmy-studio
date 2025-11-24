import type { StoreApi } from 'zustand/vanilla';
import type { DocStore } from './docStore';
import type { EngineStore } from './engineStore';

/**
 * docStore의 변경사항을 engineStore에 자동으로 반영하는 바인딩 로직
 */
export function bindDocToEngine(
  docStore: StoreApi<DocStore>,
  engineStore: StoreApi<EngineStore>
) {
  console.log('[Binding] Setting up doc-to-engine bindings');

  const unsubscribe = docStore.subscribe((state, prevState) => {
    const engine = engineStore.getState();

    if (!engine.isInitialized) {
      return;
    }

    // Settings 변경 시 engine에 반영
    if (state.settings !== prevState.settings) {
      if (engine.renderer && engine.timer && engine.audioManager) {
        engine.renderer.resize(state.settings.width, state.settings.height);
        engine.renderer.background = state.settings.background;
        engine.renderer.frameRate = state.settings.frameRate;
        engine.timer.durationMs = state.settings.duration;
        engine.audioManager.sampleRate = state.settings.sampleRate;
      }
    }

    // Tracks 변경 시 renderer에 반영
    if (state.tracks !== prevState.tracks) {
      if (engine.renderer) {
        const videoTracks = state.tracks.filter(
          (track) => track.type === 'video'
        );
        console.log('[Binding] Tracks updated:', videoTracks.length);
        // TODO: renderer에 tracks 업데이트 메서드 구현 필요
      }
    }

    // Assets 변경 시 assetManager에 반영
    if (state.assets !== prevState.assets) {
      if (engine.assetManager) {
        console.log('[Binding] Assets updated:', state.assets.length);
        // TODO: assetManager에 assets 업데이트 메서드 구현 필요
      }
    }
  });

  // Cleanup function
  return () => {
    console.log('[Binding] Cleaning up doc-to-engine bindings');
    unsubscribe();
  };
}
