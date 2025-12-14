import { afterEach, beforeEach, vi } from 'vitest';

/**
 * 테스트 환경에서 `Timer`가 의존하는 `requestAnimationFrame` + `performance.now()`를
 * 결정적으로(deterministic) 제어하기 위한 공통 셋업.
 *
 * - RAF는 16ms 간격 setTimeout으로 스케줄링
 * - `performance.now()`는 프레임마다 16ms씩 증가
 *
 * 참고: `advanceFrames`는 fake timer(`vi.useFakeTimers`)가 켜진 상태에서 사용해야
 * 가장 안정적으로 동작한다.
 */

type RafCallback = (time: number) => void;

const originalRaf = globalThis.requestAnimationFrame;
const originalCaf = globalThis.cancelAnimationFrame;

let advanceFramesImpl: (ms: number) => Promise<void> = async () => {
  throw new Error('[test/setup] advanceFrames is not initialized');
};

/**
 * 가상 RAF 프레임을 지정한 시간(ms)만큼 진행시킨다.
 * @param ms
 */
export const advanceFrames = (ms: number) => advanceFramesImpl(ms);

const installDeterministicRaf = () => {
  let now = 0;
  const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => now);

  let nextId = 1;
  const handles = new Map<number, ReturnType<typeof setTimeout>>();

  const raf = (cb: RafCallback): number => {
    const id = nextId++;
    const handle = setTimeout(() => {
      handles.delete(id);
      now += 16;
      cb(now);
    }, 16);
    handles.set(id, handle);
    return id;
  };

  const caf = (id: number) => {
    const handle = handles.get(id);
    if (handle) {
      clearTimeout(handle);
      handles.delete(id);
    }
  };

  // node 환경에서도 Timer가 동작하도록 RAF를 제공
  globalThis.requestAnimationFrame =
    raf as unknown as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame =
    caf as unknown as typeof cancelAnimationFrame;

  const advanceFrames = async (ms: number) => {
    const steps = Math.ceil(ms / 16);
    for (let i = 0; i < steps; i++) {
      await vi.advanceTimersByTimeAsync(16);
    }
  };

  return {
    advanceFrames,
    restore: () => {
      nowSpy.mockRestore();
      for (const handle of handles.values()) {
        clearTimeout(handle);
      }
      handles.clear();

      // requestAnimationFrame/cancelAnimationFrame 은 전역이라 테스트 간 누수 방지
      (globalThis as any).requestAnimationFrame = originalRaf;
      (globalThis as any).cancelAnimationFrame = originalCaf;
    },
  };
};

let restoreEnv: (() => void) | null = null;

beforeEach(() => {
  vi.useFakeTimers();

  const env = installDeterministicRaf();
  advanceFramesImpl = env.advanceFrames;
  restoreEnv = env.restore;
});

afterEach(() => {
  restoreEnv?.();
  restoreEnv = null;

  vi.useRealTimers();
  vi.restoreAllMocks();
});
