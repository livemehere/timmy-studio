export class AudioManager {
  sampleRate: number = 44100;
  constructor() {
    console.debug('[AudioManager] Constructor called');
  }

  destroy() {
    console.debug('[AudioManager] Destroy called');
  }
}
