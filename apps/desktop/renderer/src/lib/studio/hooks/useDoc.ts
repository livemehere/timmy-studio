import type { ITrack, IVideoClip, IAudioClip, IAsset } from '../types';
import { useDocStore } from './useStudioStores';

// ============================================================================
// Document State Hooks (DocStore)
// 문서 데이터(tracks, assets, settings 등)에 접근하는 hooks
// ============================================================================

/**
 * 모든 tracks를 가져오는 hook
 */
export function useDocTracks() {
  return useDocStore((state) => state.tracks);
}

/**
 * 개별 track을 id 기반으로 선택하는 hook
 * @returns ITrack | undefined
 */
export function useDocTrack<T extends ITrack = ITrack>(
  trackId: string
): T | undefined {
  return useDocStore((state) =>
    state.tracks.find((track) => track.id === trackId)
  ) as T | undefined;
}

/**
 * 개별 clip을 id 기반으로 선택하는 hook
 * @returns IVideoClip | IAudioClip | undefined
 */
export function useDocClip<T extends IVideoClip | IAudioClip = IVideoClip>(
  clipId: string
): T | undefined {
  return useDocStore((state) => {
    for (const track of state.tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) return clip as T;
    }
    return undefined;
  });
}

/**
 * 모든 assets를 가져오는 hook
 */
export function useDocAssets() {
  return useDocStore((state) => state.assets);
}

/**
 * 개별 asset을 id 기반으로 선택하는 hook
 * @returns IAsset | undefined
 */
export function useDocAsset<T extends IAsset = IAsset>(
  assetId: string
): T | undefined {
  return useDocStore((state) =>
    state.assets.find((asset) => asset.id === assetId)
  ) as T | undefined;
}

/**
 * project settings를 가져오는 hook
 */
export function useDocSettings() {
  return useDocStore((state) => state.settings);
}

/**
 * project metadata를 가져오는 hook
 */
export function useDocMetadata() {
  return useDocStore((state) => state.metadata);
}

/**
 * project name을 가져오는 hook
 */
export function useDocName() {
  return useDocStore((state) => state.name);
}

// ============================================================================
// Document Actions Hooks (DocStore)
// 문서 데이터를 수정하는 actions에 접근하는 hooks
// ============================================================================

/**
 * DocStore의 모든 actions를 가져오는 hook
 */
export function useDocActions() {
  return useDocStore((state) => ({
    loadProject: state.loadProject,
    getProject: state.getProject,
    updateSettings: state.updateSettings,
    updateMetadata: state.updateMetadata,
    updateName: state.updateName,
    addTrack: state.addTrack,
    removeTrack: state.removeTrack,
    updateTrack: state.updateTrack,
    addAsset: state.addAsset,
    removeAsset: state.removeAsset,
    updateAsset: state.updateAsset,
    reset: state.reset,
  }));
}
