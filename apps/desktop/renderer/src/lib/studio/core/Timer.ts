import { BehaviorSubject } from 'rxjs';

export interface ITimer {
  currentMs: number;
  isPlaying: boolean;
  durationMs: number;
  play(): void;
  pause(): void;
  resume(): void;
  seek(ms: number): void;
  reset(): void;
  destroy(): void;
}

export class Timer implements ITimer {
  readonly currentMs$ = new BehaviorSubject<number>(0);
  readonly durationMs$ = new BehaviorSubject<number>(0);
  readonly isPlaying$ = new BehaviorSubject<boolean>(false);

  private animationFrameId: number | null = null;
  private lastTimestamp: number | null = null;

  constructor(duration: number) {
    console.log(`[Timer] new Timer(${duration})`);
    this.durationMs$.next(duration);
  }

  get currentMs() {
    return this.currentMs$.value;
  }

  get isPlaying() {
    return this.isPlaying$.value;
  }

  get durationMs() {
    return this.durationMs$.value;
  }

  set durationMs(ms: number) {
    this.durationMs$.next(ms);
  }

  play() {
    if (this.isPlaying$.value) return;

    this.isPlaying$.next(true);
    this.lastTimestamp = performance.now();
    this.tick();
  }

  pause() {
    if (!this.isPlaying$.value) return;

    this.isPlaying$.next(false);
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
    this.currentMs$.next(ms);
  }

  reset() {
    this.pause();
    this.currentMs$.next(0);
  }

  private tick = () => {
    if (!this.isPlaying$.value) return;

    const now = performance.now();
    if (this.lastTimestamp !== null) {
      const deltaTime = now - this.lastTimestamp;
      const newTime = Math.min(
        this.currentMs$.value + deltaTime,
        this.durationMs$.value
      );
      this.currentMs$.next(newTime);

      // Auto-stop when reaching duration
      if (newTime >= this.durationMs$.value) {
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
    this.currentMs$.complete();
    this.isPlaying$.complete();
    this.durationMs$.complete();
  }
}
