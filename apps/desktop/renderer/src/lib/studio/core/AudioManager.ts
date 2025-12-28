import type { IAudioTrack } from '../domains/Track/types';
import type { IAudioClip } from '@renderer/lib/studio/domains/Clip/types';

export interface SyncAudioTracksResult {
  syncedTrackIds: string[];
  syncedClipIds: string[];
}

export class AudioManager {
  sampleRate: number;

  // 내부 관리 Map
  // TODO: 실제 오디오 노드/버퍼 관리 구현
  private trackNodes = new Map<string, unknown>();
  private clipNodes = new Map<string, unknown>();
  // trackId -> Set of clipIds 매핑
  private trackClipMap = new Map<string, Set<string>>();

  constructor(sampleRate: number = 44100) {
    console.log('[AudioManager] 생성됨');
    this.sampleRate = sampleRate;
  }

  // ============================================================================
  // Track Management
  // ============================================================================

  syncTracks(tracks: IAudioTrack[]): Promise<SyncAudioTracksResult> {
    return new Promise((resolve) => {
      // 비동기 처리를 시뮬레이션하기 위해 마이크로태스크 사용
      queueMicrotask(() => {
        console.group(`[AudioManager] ${tracks.length}개 트랙 동기화 시작`);

        const currentTrackIds = new Set(tracks.map((t) => t.id));

        // 제거된 트랙 정리
        for (const trackId of this.trackNodes.keys()) {
          if (!currentTrackIds.has(trackId)) {
            this.removeTrack(trackId);
          }
        }

        // 트랙 추가 또는 업데이트
        for (const track of tracks) {
          if (this.trackNodes.has(track.id)) {
            this.updateTrack(track);
          } else {
            this.addTrack(track);
          }
        }

        const syncedTrackIds = Array.from(this.trackNodes.keys());
        const syncedClipIds = Array.from(this.clipNodes.keys());

        console.groupEnd();

        resolve({
          syncedTrackIds,
          syncedClipIds,
        });
      });
    });
  }

  private addTrack(track: IAudioTrack): void {
    // TODO: 오디오 트랙 노드 생성 (GainNode 등)
    console.log(`[AudioManager] Track added: ${track.id}`);
    this.trackNodes.set(track.id, {
      /* TODO: 실제 노드 */
    });

    // 트랙-클립 매핑 초기화
    this.trackClipMap.set(track.id, new Set());

    // 클립도 함께 추가
    this.syncClips(track.id, track.clips);
  }

  private updateTrack(track: IAudioTrack): void {
    // TODO: 트랙 속성 업데이트 (volume 등)
    console.log(`[AudioManager] Track updated: ${track.id}`);

    // 클립 동기화
    this.syncClips(track.id, track.clips);
  }

  private removeTrack(trackId: string): void {
    // 해당 트랙의 클립 노드 정리
    const clipIds = this.trackClipMap.get(trackId);
    if (clipIds) {
      for (const clipId of clipIds) {
        this.clipNodes.delete(clipId);
      }
    }

    // TODO: 트랙 노드 정리
    this.trackNodes.delete(trackId);
    this.trackClipMap.delete(trackId);
    console.log(`[AudioManager] Track removed: ${trackId}`);
  }

  // ============================================================================
  // Clip Management
  // ============================================================================

  private syncClips(trackId: string, clips: IAudioClip[]): void {
    console.log(
      `[AudioManager] syncClips for track ${trackId}: ${clips.length} clips`
    );

    const currentClipIds = new Set(clips.map((c) => c.id));

    // 제거된 클립 정리
    for (const clipId of this.clipNodes.keys()) {
      if (!currentClipIds.has(clipId)) {
        this.removeClip(clipId);
      }
    }

    // 클립 추가 또는 업데이트
    for (const clip of clips) {
      if (this.clipNodes.has(clip.id)) {
        this.updateClip(clip);
      } else {
        this.addClip(trackId, clip);
      }
    }
  }

  private addClip(trackId: string, clip: IAudioClip): void {
    // TODO: 오디오 클립 노드 생성 (AudioBufferSourceNode 등)
    console.log(`[AudioManager] Clip added: ${clip.id} to track ${trackId}`);
    this.clipNodes.set(clip.id, { trackId /* TODO: 실제 노드 */ });

    // trackClipMap에 클립 ID 추가
    const clipIds = this.trackClipMap.get(trackId);
    if (clipIds) {
      clipIds.add(clip.id);
    }
  }

  private updateClip(clip: IAudioClip): void {
    // TODO: 클립 속성 업데이트 (volume, trimStart, trimEnd 등)
    console.log(`[AudioManager] Clip updated: ${clip.id}`);
  }

  private removeClip(clipId: string): void {
    // TODO: 클립 노드 정리
    const node = this.clipNodes.get(clipId) as { trackId: string } | undefined;
    if (node) {
      const clipIds = this.trackClipMap.get(node.trackId);
      if (clipIds) {
        clipIds.delete(clipId);
      }
    }

    this.clipNodes.delete(clipId);
    console.log(`[AudioManager] Clip removed: ${clipId}`);
  }

  // ============================================================================
  // Public Accessors
  // ============================================================================

  getTrackNode(trackId: string): unknown | null {
    return this.trackNodes.get(trackId) ?? null;
  }

  getClipNode(clipId: string): unknown | null {
    return this.clipNodes.get(clipId) ?? null;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    console.log('[AudioManager] Destroy called');

    // TODO: 모든 오디오 노드 정리
    for (const trackId of this.trackNodes.keys()) {
      this.removeTrack(trackId);
    }

    this.trackNodes.clear();
    this.clipNodes.clear();
  }
}
