import type { IAudioTrack } from '@renderer/lib/studio/types';

export class AudioManager {
  sampleRate: number;
  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
    console.debug('[AudioManager] Constructor called');
  }

  syncTracks(tracks: IAudioTrack[]) {
    console.debug(
      `[AudioManager] syncTracks called with ${tracks.length} audio tracks`
    );
    //TODO: 여기에 오디오 트랙 동기화 로직 구현
  }

  destroy() {
    console.debug('[AudioManager] Destroy called');
  }
}
