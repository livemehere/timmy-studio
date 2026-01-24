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

  private seekWaiter: ((ms: number) => Promise<void>) | null = null;

  constructor(duration: number) {
    this.durationMs$.next(duration);
    console.log(
      `[Timer] 인스턴스 생성됨 - ${duration} ms (${(duration / 1000).toFixed(2)}s)`
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

    // deltaTime 계산을 위한 타임스탬프 저장
    this.lastTimestamp = performance.now();

    // 루프를 시작
    this.tick();
  }

  pause() {
    if (!this.isPlaying$.value) return;

    this.isPlaying$.next(false);
    this.lastTimestamp = null;

    // 루프 중지
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  seek(ms: number) {
    // 같은 위치로의 seek는 무시
    if (this.currentMs$.value === ms) return;

    // 재생 중일 때는 반드시 일시정지
    if (this.isPlaying) {
      this.pause();
    }

    // 타임 업데이트
    this.currentMs$.next(ms);
  }

  // Timer 는 seek 이후에, 외부의 비동기 작업과 연동할 수 있도록 waiter 를 설정할 수 있다.
  setSeekWaiter(waiter: ((ms: number) => Promise<void>) | null): void {
    this.seekWaiter = waiter;
  }

  // seek() 와 동일하지만 등록된 비동기 작업을 기다려, 외부에서 타이밍을 조절할 수 있다.
  async seekAndWait(ms: number): Promise<void> {
    const waitPromise = this.seekWaiter ? this.seekWaiter(ms) : null;
    this.seek(ms);
    if (waitPromise) {
      await waitPromise;
    }
  }

  reset() {
    this.seek(0);
  }

  private tick = () => {
    if (!this.isPlaying$.value) return;

    const now = performance.now();
    if (this.lastTimestamp !== null) {
      const deltaTime = now - this.lastTimestamp;
      // duration 을 넘지 않도록 방어처리
      const newTime = Math.min(
        this.currentMs$.value + deltaTime,
        this.durationMs$.value
      );
      this.currentMs$.next(newTime);

      // duration 에 도달하면 자동으로 일시정지
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
