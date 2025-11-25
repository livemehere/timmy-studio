import type { IAudioTrack, IAudioClip } from '@renderer/lib/studio/types';

export class AudioManager {
  sampleRate: number;

  // 내부 관리 Map
  // TODO: 실제 오디오 노드/버퍼 관리 구현
  private trackNodes = new Map<string, unknown>();
  private clipNodes = new Map<string, unknown>();

  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
    console.debug('[AudioManager] Constructor called');
  }

  // ============================================================================
  // Track Management
  // ============================================================================

  syncTracks(tracks: IAudioTrack[]): void {
    console.debug(
      `[AudioManager] syncTracks called with ${tracks.length} audio tracks`
    );

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
  }

  private addTrack(track: IAudioTrack): void {
    // TODO: 오디오 트랙 노드 생성 (GainNode 등)
    console.debug(`[AudioManager] Track added: ${track.id}`);
    this.trackNodes.set(track.id, {
      /* TODO: 실제 노드 */
    });

    // 클립도 함께 추가
    this.syncClips(track.id, track.clips);
  }

  private updateTrack(track: IAudioTrack): void {
    // TODO: 트랙 속성 업데이트 (volume 등)
    console.debug(`[AudioManager] Track updated: ${track.id}`);

    // 클립 동기화
    this.syncClips(track.id, track.clips);
  }

  private removeTrack(trackId: string): void {
    // 해당 트랙의 클립 노드 정리
    for (const [clipId, node] of this.clipNodes) {
      // TODO: 클립이 이 트랙에 속하는지 확인 후 정리
      void node;
      void clipId;
    }

    // TODO: 트랙 노드 정리
    this.trackNodes.delete(trackId);
    console.debug(`[AudioManager] Track removed: ${trackId}`);
  }

  // ============================================================================
  // Clip Management
  // ============================================================================

  private syncClips(trackId: string, clips: IAudioClip[]): void {
    console.debug(
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
    console.debug(`[AudioManager] Clip added: ${clip.id} to track ${trackId}`);
    this.clipNodes.set(clip.id, { trackId /* TODO: 실제 노드 */ });
  }

  private updateClip(clip: IAudioClip): void {
    // TODO: 클립 속성 업데이트 (volume, trimStart, trimEnd 등)
    console.debug(`[AudioManager] Clip updated: ${clip.id}`);
  }

  private removeClip(clipId: string): void {
    // TODO: 클립 노드 정리
    this.clipNodes.delete(clipId);
    console.debug(`[AudioManager] Clip removed: ${clipId}`);
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
    console.debug('[AudioManager] Destroy called');

    // TODO: 모든 오디오 노드 정리
    for (const trackId of this.trackNodes.keys()) {
      this.removeTrack(trackId);
    }

    this.trackNodes.clear();
    this.clipNodes.clear();
  }
}
