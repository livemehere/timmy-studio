import { describe, expect, it, vi } from 'vitest';
import { Timer } from '@/lib/studio/engine/Timer';
import { advanceFrames } from '../__tests__/setup';

describe('Timer', () => {
  it('초기 상태는 0ms, 정지 상태이다', () => {
    const timer = new Timer(1000);
    expect(timer.currentMs).toBe(0);
    expect(timer.isPlaying).toBe(false);
    expect(timer.durationMs).toBe(1000);
  });

  it('subscribe는 현재 상태를 즉시 전달하고, unsubscribe 이후에는 더 이상 알리지 않는다', async () => {
    const timer = new Timer(1000);

    const listener = vi.fn();
    const unsubscribe = timer.subscribe(listener);

    // 구현 상 "즉시 상태 전달" + BehaviorSubject 3개 구독의 초기 방출로 여러 번 호출될 수 있음
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0]).toEqual({
      currentMs: 0,
      isPlaying: false,
      durationMs: 1000,
    });

    // 구독하고 나서는, 시간이 흐르면 호출됨
    const calledBefore = listener.mock.calls.length;
    timer.play();
    await advanceFrames(48);
    expect(listener.mock.calls.length).toBeGreaterThan(calledBefore);

    // 구독을 취소하면 더 이상 호출되지 않아야함
    unsubscribe();
    const calledAtUnsub = listener.mock.calls.length;

    await advanceFrames(64);
    expect(listener.mock.calls.length).toBe(calledAtUnsub);
  });

  it('play를 호출하면 시간이 증가한다', async () => {
    const timer = new Timer(1000);

    timer.play();
    await advanceFrames(64);

    expect(timer.isPlaying).toBe(true);
    expect(timer.currentMs).toBeGreaterThan(0);
  });

  it('pause 이후에는 시간이 더 이상 증가하지 않는다', async () => {
    const timer = new Timer(1000);

    timer.play();
    await advanceFrames(64);
    const t1 = timer.currentMs;

    timer.pause();
    await advanceFrames(128);
    const t2 = timer.currentMs;

    expect(timer.isPlaying).toBe(false);
    expect(t2).toBe(t1);
  });

  it('duration에 도달하면 자동으로 정지(pause)되고, currentMs는 duration을 넘지 않는다', async () => {
    const timer = new Timer(100);

    timer.play();
    await advanceFrames(1000);

    expect(timer.isPlaying).toBe(false);
    expect(timer.currentMs).toBeLessThanOrEqual(100);
    expect(Math.round(timer.currentMs)).toBe(100);
  });

  it('seek은 재생 중이면 자동으로 pause하고, 현재 시간을 지정 값으로 변경한다', async () => {
    const timer = new Timer(1000);

    timer.play();
    await advanceFrames(48);
    expect(timer.isPlaying).toBe(true);

    timer.seek(250);
    expect(timer.isPlaying).toBe(false);
    expect(timer.currentMs).toBe(250);
  });

  it('reset은 시간을 0으로 되돌리고 정지한다', async () => {
    const timer = new Timer(1000);

    timer.play();
    await advanceFrames(48);
    expect(timer.currentMs).toBeGreaterThan(0);

    timer.reset();
    expect(timer.isPlaying).toBe(false);
    expect(timer.currentMs).toBe(0);
  });

  it('seekAndWait은 waiter가 있으면 완료될 때까지 기다린다', async () => {
    const timer = new Timer(1000);

    let resolveWait: (() => void) | null = null;
    const waiter = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveWait = resolve;
        })
    );
    timer.setSeekWaiter(waiter);

    const promise = timer.seekAndWait(123);
    expect(waiter).toHaveBeenCalledWith(123);
    expect(timer.currentMs).toBe(123);

    let finished = false;
    void promise.then(() => {
      finished = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(finished).toBe(false);

    resolveWait!();
    await promise;
    expect(finished).toBe(true);
  });
});
