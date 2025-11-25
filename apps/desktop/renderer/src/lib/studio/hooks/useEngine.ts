import { useEngineStore } from './useStudioStores';

// ============================================================================
// Engine State Hooks (EngineStore)
// 런타임 엔진 인스턴스 및 상태에 접근하는 hooks
// ============================================================================

/**
 * Engine 초기화 상태를 가져오는 hook
 */
export function useEngineInitialized(): boolean {
  return useEngineStore((state) => state.isInitialized);
}

/**
 * Timer 인스턴스를 가져오는 hook
 */
export function useEngineTimer() {
  return useEngineStore((state) => state.timer);
}

/**
 * Renderer 인스턴스를 가져오는 hook
 */
export function useEngineRenderer() {
  return useEngineStore((state) => state.renderer);
}

/**
 * AudioManager 인스턴스를 가져오는 hook
 */
export function useEngineAudioManager() {
  return useEngineStore((state) => state.audioManager);
}

/**
 * AssetManager 인스턴스를 가져오는 hook
 */
export function useEngineAssetManager() {
  return useEngineStore((state) => state.assetManager);
}

/**
 * EngineStore의 모든 actions를 가져오는 hook
 */
export function useEngineActions() {
  return useEngineStore((state) => ({
    init: state.init,
    destroy: state.destroy,
    setRendererReady: state.setRendererReady,
    setSyncedTrackIds: state.setSyncedTrackIds,
    setSyncedClipIds: state.setSyncedClipIds,
    setAudioReady: state.setAudioReady,
    setSyncedAudioTrackIds: state.setSyncedAudioTrackIds,
    setSyncedAudioClipIds: state.setSyncedAudioClipIds,
  }));
}
