import type { Container, Sprite } from 'pixi.js';
import { useEngineStore } from './useStudioStores';

// ============================================================================
// Pixi.js Object Hooks (Renderer sync 후 사용 가능)
// Renderer의 Pixi.js 객체(Container, Sprite)에 접근하는 hooks
// ============================================================================

/**
 * Renderer가 ready 상태인지 확인하는 hook
 * Pixi Track/Clip Container/Sprite를 가져오기 전에 체크 필요
 */
export function usePixiReady(): boolean {
  return useEngineStore((state) => state.isRendererReady);
}

/**
 * 동기화된 Video Track IDs를 가져오는 hook
 */
export function usePixiSyncedTrackIds(): string[] {
  return useEngineStore((state) => state.syncedTrackIds);
}

/**
 * 동기화된 Video Clip IDs를 가져오는 hook
 */
export function usePixiSyncedClipIds(): string[] {
  return useEngineStore((state) => state.syncedClipIds);
}

/**
 * Track의 Pixi Container를 가져오는 hook
 * @returns Container | null (Renderer가 ready 상태가 아니거나 track이 없으면 null)
 */
export function usePixiTrackContainer(trackId: string): Container | null {
  const renderer = useEngineStore((state) => state.renderer);
  const isReady = useEngineStore((state) => state.isRendererReady);
  // syncedTrackIds를 구독하여 sync 완료 시 리렌더링
  const syncedTrackIds = useEngineStore((state) => state.syncedTrackIds);

  if (!isReady || !renderer || !syncedTrackIds.includes(trackId)) {
    return null;
  }

  return renderer.getTrackContainer(trackId) ?? null;
}

/**
 * Clip의 Pixi Sprite를 가져오는 hook
 * @returns Sprite | null (Renderer가 ready 상태가 아니거나 clip이 없으면 null)
 */
export function usePixiClipSprite(clipId: string): Sprite | null {
  const renderer = useEngineStore((state) => state.renderer);
  const isReady = useEngineStore((state) => state.isRendererReady);
  // syncedClipIds를 구독하여 sync 완료 시 리렌더링
  const syncedClipIds = useEngineStore((state) => state.syncedClipIds);

  if (!isReady || !renderer || !syncedClipIds.includes(clipId)) {
    return null;
  }

  return renderer.getClipSprite(clipId) ?? null;
}
