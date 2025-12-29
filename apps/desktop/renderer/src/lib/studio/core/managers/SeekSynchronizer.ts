import type { Timer } from '../Timer';
import type { ClipState } from '../types';

export class SeekSynchronizer {
  private seekSessionId = 0;
  private activeSeekWait: {
    id: number;
    targetMs: number;
    remainingDirty: number;
    started: boolean;
    resolve: () => void;
  } | null = null;

  constructor(private timer: Timer) {}

  get currentSeekSessionId(): number {
    return this.seekSessionId;
  }

  /**
   * 특정 시점으로의 탐색(Seek)이 렌더링적으로 완료될 때까지 대기합니다.
   * 비디오 로딩이나 텍스처 업로드 등 비동기 작업이 완료되기를 기다립니다.
   */
  waitForSeekSettled(targetMs: number): Promise<void> {
    // 재생 중이 아니며 이미 해당 시간에 있다면 즉시 완료
    if (!this.timer.isPlaying && this.timer.currentMs === targetMs) {
      return Promise.resolve();
    }

    const id = ++this.seekSessionId;
    return new Promise<void>((resolve) => {
      this.activeSeekWait = {
        id,
        targetMs,
        remainingDirty: 0,
        started: false,
        resolve,
      };
    });
  }

  /** 렌더 루프에서 호출되어 Seek 대기 상태를 해제할지 판단합니다. */
  maybeResolveSeekWait(isSeeking: boolean): void {
    const wait = this.activeSeekWait;
    if (!wait) return;

    // 목표 시간에 도달했는지 확인
    if (!this.timer.isPlaying && this.timer.currentMs === wait.targetMs) {
      // Seek 중이거나 아직 시작 처리가 안 되었다면 시작 플래그 설정
      if (isSeeking || !wait.started) {
        wait.started = true;
      }
    }

    // 대기 중인 비동기 작업(remainingDirty)이 없으면 완료 처리
    if (wait.started && wait.remainingDirty === 0) {
      this.activeSeekWait = null;
      wait.resolve();
    }
  }

  /** 클립의 상태가 변경되어 렌더링 업데이트가 필요함을 표시합니다. */
  markClipDirty(state: ClipState, sessionId: number | null): void {
    if (!state.dirty) {
      state.dirty = true;
      state.dirtySessionId = sessionId;
      const wait = this.activeSeekWait;
      if (wait && sessionId != null && wait.id === sessionId) {
        wait.remainingDirty += 1;
      }
      return;
    }

    if (state.dirtySessionId !== sessionId) {
      state.dirtySessionId = sessionId;
    }
  }

  /** 클립의 렌더링 업데이트가 완료되었음을 표시합니다. */
  clearClipDirty(state: ClipState, sessionId: number | null): void {
    if (!state.dirty) return;

    const wait = this.activeSeekWait;
    if (
      wait &&
      sessionId != null &&
      wait.id === sessionId &&
      state.dirtySessionId === sessionId
    ) {
      wait.remainingDirty = Math.max(0, wait.remainingDirty - 1);
    }

    state.dirty = false;
    state.dirtySessionId = null;

    // 모든 작업이 완료되었다면 대기 해제
    if (wait && wait.started && wait.remainingDirty === 0) {
      this.activeSeekWait = null;
      wait.resolve();
    }
  }
}
