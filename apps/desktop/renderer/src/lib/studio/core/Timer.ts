import { BehaviorSubject } from 'rxjs';

export type PlaybackMode = 'playing' | 'seeking' | 'paused';

export interface PlaybackContext {
  currentTime: number;
  mode: PlaybackMode;
}

export class Timer {
  private currentTime$ = new BehaviorSubject<number>(0);
  private playbackMode$ = new BehaviorSubject<PlaybackMode>('paused');
  private isPlaying = false;
  private animationFrameId: number | null = null;
  private lastTimestamp: number | null = null;
  private duration: number;

  constructor(duration: number) {
    this.duration = duration;
  }

  get current() {
    return this.currentTime$.value;
  }

  get playing() {
    return this.isPlaying;
  }

  get mode(): PlaybackMode {
    return this.playbackMode$.value;
  }

  get context(): PlaybackContext {
    return {
      currentTime: this.current,
      mode: this.mode,
    };
  }

  setDuration(duration: number) {
    this.duration = duration;
  }

  subscribe(callback: (time: number) => void) {
    const subscription = this.currentTime$.subscribe(callback);
    return () => {
      subscription.unsubscribe();
    };
  }

  play() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.playbackMode$.next('playing');
    this.lastTimestamp = performance.now();
    this.tick();
  }

  pause() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.playbackMode$.next('paused');
    this.lastTimestamp = null;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume() {
    this.play();
  }

  seek(ms: number) {
    // Set mode to seeking temporarily
    this.playbackMode$.next('seeking');
    this.currentTime$.next(ms);

    // Reset mode back to previous state after a short delay
    setTimeout(() => {
      if (this.isPlaying) {
        this.playbackMode$.next('playing');
      } else {
        this.playbackMode$.next('paused');
      }
    }, 100);
  }

  reset() {
    this.pause();
    this.currentTime$.next(0);
  }

  private tick = () => {
    if (!this.isPlaying) return;

    const now = performance.now();
    if (this.lastTimestamp !== null) {
      const deltaTime = now - this.lastTimestamp;
      const newTime = Math.min(this.currentTime$.value + deltaTime, this.duration);
      this.currentTime$.next(newTime);

      // Auto-stop when reaching duration
      if (newTime >= this.duration) {
        this.pause();
        return;
      }
    }

    this.lastTimestamp = now;
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  destroy() {
    this.pause();
    this.currentTime$.complete();
  }
}
