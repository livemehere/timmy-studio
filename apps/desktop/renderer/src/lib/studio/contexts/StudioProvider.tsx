import { createContext, useRef, useContext, useEffect } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';
import type { Container, Sprite } from 'pixi.js';
import type { IAudioClip, IProject, IVideoClip } from '../types';
import { createDocStore, type DocStore } from '../stores/docStore';
import { createEngineStore, type EngineStore } from '../stores/engineStore';
import { bindDocToEngine } from '../stores/bindDocToEngine';

interface StudioStores {
  docStore: StoreApi<DocStore>;
  engineStore: StoreApi<EngineStore>;
}

const StudioContext = createContext<StudioStores | null>(null);

export function StudioProvider({
  children,
  initialProject,
}: {
  children: React.ReactNode;
  initialProject: IProject;
}) {
  const storesRef = useRef<StudioStores | null>(null);
  const unbindRef = useRef<(() => void) | null>(null);

  // Initialize stores once
  if (!storesRef.current) {
    const docStore = createDocStore(initialProject);
    const engineStore = createEngineStore();

    storesRef.current = {
      docStore,
      engineStore,
    };

    // Initialize engine with project
    engineStore.getState().init(initialProject);

    // Bind doc changes to engine
    unbindRef.current = bindDocToEngine(docStore, engineStore);
  }

  // Update project when initialProject changes
  useEffect(() => {
    if (storesRef.current) {
      storesRef.current.docStore.getState().loadProject(initialProject);
      storesRef.current.engineStore.getState().init(initialProject);
    }
  }, [initialProject]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unbindRef.current) {
        unbindRef.current();
      }
      if (storesRef.current) {
        storesRef.current.engineStore.getState().destroy();
      }
    };
  }, []);

  return (
    <StudioContext.Provider value={storesRef.current}>
      {children}
    </StudioContext.Provider>
  );
}

function useStudioStores(): StudioStores {
  const stores = useContext(StudioContext);
  if (!stores) {
    throw new Error('useStudioStores must be used within a StudioProvider');
  }
  return stores;
}

/**
 * docStore에 접근하는 hook
 * @example
 * const tracks = useDocStore((state) => state.tracks);
 * const addTrack = useDocStore((state) => state.addTrack);
 */
export function useDocStore<T>(selector: (state: DocStore) => T): T {
  const { docStore } = useStudioStores();
  return useStore(docStore, selector);
}

/**
 * engineStore에 접근하는 hook
 * @example
 * const renderer = useEngineStore((state) => state.renderer);
 */
export function useEngineStore<T>(selector: (state: EngineStore) => T): T {
  const { engineStore } = useStudioStores();
  return useStore(engineStore, selector);
}

/**
 * 개별 track을 id 기반으로 선택하는 hook (리렌더 최소화)
 */
export function useTrack(trackId: string) {
  return useDocStore((state) =>
    state.tracks.find((track) => track.id === trackId)
  );
}

export function useClip<T extends IVideoClip | IAudioClip>(clipId: string) {
  return useDocStore((state) => {
    for (const track of state.tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) return clip as T;
    }
    return undefined;
  });
}

/**
 * 개별 asset을 id 기반으로 선택하는 hook (리렌더 최소화)
 */
export function useAsset(assetId: string) {
  return useDocStore((state) =>
    state.assets.find((asset) => asset.id === assetId)
  );
}

// ============================================================================
// Pixi.js Object Hooks (Renderer sync 후 사용 가능)
// ============================================================================

/**
 * Renderer가 ready 상태인지 확인하는 hook
 * Track/Clip Container/Sprite를 가져오기 전에 체크 필요
 */
export function useRendererReady(): boolean {
  return useEngineStore((state) => state.isRendererReady);
}

/**
 * Track의 Pixi Container를 가져오는 hook
 * @returns Container | null (Renderer가 ready 상태가 아니거나 track이 없으면 null)
 */
export function useTrackContainer(trackId: string): Container | null {
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
export function useClipSprite(clipId: string): Sprite | null {
  const renderer = useEngineStore((state) => state.renderer);
  const isReady = useEngineStore((state) => state.isRendererReady);
  // syncedClipIds를 구독하여 sync 완료 시 리렌더링
  const syncedClipIds = useEngineStore((state) => state.syncedClipIds);

  if (!isReady || !renderer || !syncedClipIds.includes(clipId)) {
    return null;
  }

  return renderer.getClipSprite(clipId) ?? null;
}

// ============================================================================
// AudioManager Object Hooks (Audio sync 후 사용 가능)
// TODO: AudioManager 구현 완료 후 실제 타입으로 변경
// ============================================================================

/**
 * AudioManager가 ready 상태인지 확인하는 hook
 * Audio Track/Clip Node를 가져오기 전에 체크 필요
 */
export function useAudioReady(): boolean {
  return useEngineStore((state) => state.isAudioReady);
}

/**
 * Audio Track의 Node를 가져오는 hook
 * TODO: AudioManager 구현 완료 후 실제 타입(GainNode 등)으로 변경
 * @returns unknown | null (AudioManager가 ready 상태가 아니거나 track이 없으면 null)
 */
export function useAudioTrackNode(trackId: string): unknown | null {
  const audioManager = useEngineStore((state) => state.audioManager);
  const isReady = useEngineStore((state) => state.isAudioReady);
  // syncedAudioTrackIds를 구독하여 sync 완료 시 리렌더링
  const syncedAudioTrackIds = useEngineStore((state) => state.syncedAudioTrackIds);

  if (!isReady || !audioManager || !syncedAudioTrackIds.includes(trackId)) {
    return null;
  }

  return audioManager.getTrackNode(trackId);
}

/**
 * Audio Clip의 Node를 가져오는 hook
 * TODO: AudioManager 구현 완료 후 실제 타입(AudioBufferSourceNode 등)으로 변경
 * @returns unknown | null (AudioManager가 ready 상태가 아니거나 clip이 없으면 null)
 */
export function useAudioClipNode(clipId: string): unknown | null {
  const audioManager = useEngineStore((state) => state.audioManager);
  const isReady = useEngineStore((state) => state.isAudioReady);
  // syncedAudioClipIds를 구독하여 sync 완료 시 리렌더링
  const syncedAudioClipIds = useEngineStore((state) => state.syncedAudioClipIds);

  if (!isReady || !audioManager || !syncedAudioClipIds.includes(clipId)) {
    return null;
  }

  return audioManager.getClipNode(clipId);
}
