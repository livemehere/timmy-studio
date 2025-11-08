import { BehaviorSubject } from 'rxjs';

export class Timer {
  private currentTime$ = new BehaviorSubject<number>(0);
  private isPlaying = false;
  private animationFrameId: number | null = null;
  private lastTimestamp: number | null = null;

  get current() {
    return this.currentTime$.value;
  }

  get playing() {
    return this.isPlaying;
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
    this.lastTimestamp = performance.now();
    this.tick();
  }

  pause() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
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
    this.currentTime$.next(ms);
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
      const newTime = this.currentTime$.value + deltaTime;
      this.currentTime$.next(newTime);
    }

    this.lastTimestamp = now;
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  destroy() {
    this.pause();
    this.currentTime$.complete();
  }
}
