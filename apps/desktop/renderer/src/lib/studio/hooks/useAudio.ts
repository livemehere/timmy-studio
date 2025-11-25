import { useEngineStore } from './useStudioStores';

// ============================================================================
// AudioManager Object Hooks (Audio sync 후 사용 가능)
// AudioManager의 오디오 객체(Node)에 접근하는 hooks
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
 * 동기화된 Audio Track IDs를 가져오는 hook
 */
export function useAudioSyncedTrackIds(): string[] {
  return useEngineStore((state) => state.syncedAudioTrackIds);
}

/**
 * 동기화된 Audio Clip IDs를 가져오는 hook
 */
export function useAudioSyncedClipIds(): string[] {
  return useEngineStore((state) => state.syncedAudioClipIds);
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
  const syncedAudioTrackIds = useEngineStore(
    (state) => state.syncedAudioTrackIds
  );

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
  const syncedAudioClipIds = useEngineStore(
    (state) => state.syncedAudioClipIds
  );

  if (!isReady || !audioManager || !syncedAudioClipIds.includes(clipId)) {
    return null;
  }

  return audioManager.getClipNode(clipId);
}
