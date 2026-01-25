import type { Timer } from './Timer';
import type { TickContext } from './types';

export abstract class RendererBase {
  public readonly timer: Timer;

  protected _lastIsPlaying = false;
  protected _lastCurrentMs = 0;

  protected constructor(timer: Timer) {
    this.timer = timer;
  }

  protected captureTickContext(): TickContext {
    return this.captureTickContextFromState(
      this.timer.currentMs,
      this.timer.isPlaying
    );
  }

  protected captureTickContextFromState(
    currentTime: number,
    isPlaying: boolean
  ): TickContext {
    const wasPlaying = this._lastIsPlaying;
    const lastTime = this._lastCurrentMs;

    return {
      currentTime,
      isPlaying,
      wasPlaying,
      lastTime,
      playStateChanged: isPlaying !== wasPlaying,
      isSeeking: !isPlaying && currentTime !== lastTime,
    };
  }

  protected commitFrameContext(ctx: TickContext): void {
    this._lastIsPlaying = ctx.isPlaying;
    this._lastCurrentMs = ctx.currentTime;
  }

  protected resetTickState(): void {
    this._lastIsPlaying = false;
    this._lastCurrentMs = 0;
  }
}
