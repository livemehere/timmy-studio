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
 * TODO: AudioRenderer 구현 완료 후 실제 타입(GainNode 등)으로 변경
 * @returns unknown | null (AudioRenderer가 ready 상태가 아니거나 track이 없으면 null)
 */
export function useAudioTrackNode(trackId: string): unknown | null {
  const audioRenderer = useEngineStore((state) => state.audioRenderer);
  const isReady = useEngineStore((state) => state.isAudioReady);
  // syncedAudioTrackIds를 구독하여 sync 완료 시 리렌더링
  const syncedAudioTrackIds = useEngineStore(
    (state) => state.syncedAudioTrackIds
  );

  if (!isReady || !audioRenderer || !syncedAudioTrackIds.includes(trackId)) {
    return null;
  }

  // AudioTrack 인스턴스에서 outputNode(GainNode)를 반환하거나 트랙 자체를 반환
  // 현재 AudioRenderer는 getTrackNode 메서드가 없으므로 getTrack을 사용
  const track = audioRenderer.getTrack(trackId);
  return track ? track.outputNode : null;
}

/**
 * Audio Clip의 Node를 가져오는 hook
 * TODO: AudioRenderer 구현 완료 후 실제 타입(AudioBufferSourceNode 등)으로 변경
 * @returns unknown | null (AudioRenderer가 ready 상태가 아니거나 clip이 없으면 null)
 */
export function useAudioClipNode(clipId: string): unknown | null {
  const audioRenderer = useEngineStore((state) => state.audioRenderer);
  const isReady = useEngineStore((state) => state.isAudioReady);

  if (!isReady || !audioRenderer) {
    return null;
  }

  // AudioRenderer의 모든 트랙을 순회하며 Clip을 찾음
  // (추후 성능을 위해 Clip ID -> Track ID 맵을 캐싱하거나 AudioRenderer에 맵을 추가하는 것이 좋음)
  for (const track of audioRenderer.tracks.values()) {
    const clip = track.clips.get(clipId);
    if (clip) {
      return clip.outputNode;
    }
  }

  return null;
}
