import { BehaviorSubject } from 'rxjs';

export class Timer {
  private currentTimeMs$ = new BehaviorSubject<number>(0);
  private _durationMs: number;

  private _isPlaying = false;
  private animationFrameId: number | null = null;
  private lastTimestamp: number | null = null;

  constructor(duration: number) {
    console.log(`[Timer] new Timer(${duration})`);
    this._durationMs = duration;
  }

  get currentMs() {
    return this.currentTimeMs$.value;
  }

  get isPlaying() {
    return this._isPlaying;
  }

  get durationMs() {
    return this._durationMs;
  }

  set durationMs(ms: number) {
    this._durationMs = ms;
  }

  subscribe(callback: (time: number) => void) {
    const subscription = this.currentTimeMs$.subscribe(callback);
    return () => {
      subscription.unsubscribe();
    };
  }

  play() {
    if (this._isPlaying) return;

    this._isPlaying = true;
    this.lastTimestamp = performance.now();
    this.tick();
  }

  pause() {
    if (!this._isPlaying) return;

    this._isPlaying = false;
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
    this.currentTimeMs$.next(ms);
  }

  reset() {
    this.pause();
    this.currentTimeMs$.next(0);
  }

  private tick = () => {
    if (!this._isPlaying) return;

    const now = performance.now();
    if (this.lastTimestamp !== null) {
      const deltaTime = now - this.lastTimestamp;
      const newTime = Math.min(
        this.currentTimeMs$.value + deltaTime,
        this._durationMs
      );
      this.currentTimeMs$.next(newTime);

      // Auto-stop when reaching duration
      if (newTime >= this._durationMs) {
        this.pause();
        return;
      }
    }

    this.lastTimestamp = now;
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  destroy() {
    console.log('[Timer] destroyed');
    this.pause();
    this.currentTimeMs$.complete();
  }
}
