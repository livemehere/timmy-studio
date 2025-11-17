export class AudioManager {
  sampleRate: number = 44100;
  constructor() {
    console.log('[AudioManager] new AudioManager()');
  }

  destroy() {
    console.log('[AudioManager] destroy()');
  }
}
