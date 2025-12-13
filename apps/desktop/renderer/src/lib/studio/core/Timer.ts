import { BehaviorSubject } from 'rxjs';

export interface TimerState {
  currentMs: number;
  isPlaying: boolean;
  durationMs: number;
}

export class Timer {
  private readonly currentMs$ = new BehaviorSubject<number>(0);
  private readonly durationMs$ = new BehaviorSubject<number>(0);
  private readonly isPlaying$ = new BehaviorSubject<boolean>(false);

  private animationFrameId: number | null = null;
  private lastTimestamp: number | null = null;

  constructor(duration: number) {
    this.durationMs$.next(duration);
    console.log(
      `[Timer] 생성됨 - ${duration} ms (${(duration / 1000).toFixed(2)}s)`
    );
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

  subscribe(listener: (state: TimerState) => void): () => void {
    // 즉시 현재 상태 전달
    listener(this.getState());

    // 세 개의 Observable을 합쳐서 하나의 구독으로 관리
    const subscriptions = [
      this.currentMs$.subscribe(() => listener(this.getState())),
      this.isPlaying$.subscribe(() => listener(this.getState())),
      this.durationMs$.subscribe(() => listener(this.getState())),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }

  private getState(): TimerState {
    return {
      currentMs: this.currentMs$.value,
      isPlaying: this.isPlaying$.value,
      durationMs: this.durationMs$.value,
    };
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

  seek(ms: number) {
    if (this.isPlaying) {
      this.pause();
    }
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
    console.log('[Timer] Destroy called');
    this.pause();
    this.currentMs$.complete();
    this.isPlaying$.complete();
    this.durationMs$.complete();
  }
}
