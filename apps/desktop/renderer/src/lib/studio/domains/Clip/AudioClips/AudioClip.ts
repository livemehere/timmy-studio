import type { IAudioClip } from '../types';
import type { AudioRenderer } from '@/lib/studio/engine/AudioRenderer';
import { Clip } from '../Clip';
import type { TickContext } from '@/lib/studio/engine/types';
import type {
  TrackAudioPool,
  AudioElementSlot,
} from '@/lib/studio/engine/TrackAudioPool';

/**
 * AudioClip - Pool 기반 HTMLAudioElement 스트리밍 재생
 *
 * 대용량 오디오 파일 지원을 위해 MediaElementAudioSourceNode 사용
 * - AudioBuffer 방식: 전체 파일을 메모리에 로드 (1시간 = ~600MB)
 * - MediaElement 방식: 스트리밍으로 재생 (메모리 절약)
 *
 * Pool 패턴: 같은 트랙 내 동일 asset 클립들은 audio element 를 공유.
 * 이중 버퍼링으로 재생 중 다음 클립이 미리 slot 을 확보 가능.
 */
export class AudioClip extends Clip<IAudioClip, AudioRenderer> {
  readonly type = 'audio';

  // ── Pool-based state ──
  private pool: TrackAudioPool | null = null;
  private slot: AudioElementSlot | null = null;

  // Convenience accessor
  private get audioEl(): HTMLAudioElement | null {
    return this.slot?.audioEl ?? null;
  }

  // State
  private isPlaying = false;
  private trackId: string | null = null;
  private lastTickWasPlaying: boolean | null = null;

  // Pre-warm state (이중 버퍼: 재생 중 다음 클립이 미리 슬롯 확보)
  private _isPreWarmed = false;

  public get outputNode(): GainNode | null {
    return this.slot?.gainNode ?? null;
  }

  constructor(renderer: AudioRenderer, data: IAudioClip, trackId: string) {
    super(renderer, data);
    this.trackId = trackId;
    this.debugCall(`(Audio) constructed`);
  }

  /** pre-warm 상태인지 여부 (AudioTrack 에서 확인용) */
  get isPreWarmed(): boolean {
    return this._isPreWarmed;
  }

  /** 슬롯을 보유 중인지 여부 */
  get hasSlot(): boolean {
    return this.slot !== null;
  }

  /** 외부에서 pool 을 주입한다 (AudioTrack.addClip 에서 호출) */
  setPool(pool: TrackAudioPool): void {
    this.pool = pool;
  }

  /**
   * 재생 중 다음 클립을 미리 준비한다 (이중 버퍼).
   * AudioTrack.handleAudioPreWarm() 에서 호출.
   */
  preWarm(): void {
    if (this.slot || !this.pool) return;

    const slot = this.pool.acquire(this._data.assetId, this.id);
    if (!slot) return;

    this.slot = slot;
    this._isPreWarmed = true;

    // 클립 시작 시간으로 pre-seek
    const trimStart = this._data.trimStart ?? 0;
    const startSec = trimStart / 1000;
    slot.audioEl.currentTime = startSec;
    this.debugCall(`preWarm: seeked to ${startSec.toFixed(2)}s`);
  }

  /**
   * pre-warm 상태의 슬롯을 해제한다.
   */
  releasePreWarm(): void {
    if (!this._isPreWarmed || !this.slot || !this.pool) return;
    this.pool.release(this.id);
    this.slot = null;
    this._isPreWarmed = false;
    this.debugCall('releasePreWarm');
  }

  async init(): Promise<void> {
    this.debugCall('(Audio) === init ===');

    if (!this.pool) {
      throw new Error(
        `[AudioClip] Pool not set for clip ${this.id}. Call setPool() before init().`
      );
    }

    // 슬롯 acquire 는 onBecameVisible / onTick 에서 lazy 로 수행.
    this.debugCall('(Audio) === init-end ===');
  }

  protected applyData(): void {
    // 볼륨 등 업데이트
    if (this.slot?.gainNode) {
      this.slot.gainNode.gain.value = this.data.volume ?? 1;
    }
  }

  sync(data: IAudioClip): void {
    this.debugCall('(Audio) sync');
    this._data = data;
    this.applyData();
  }

  onBecameVisible(ctx: TickContext): void {
    this.debugCall('(Audio) became visible');

    if (this._isPreWarmed && this.slot) {
      // Pre-warmed — 이미 슬롯 확보 + pre-seek 완료
      this._isPreWarmed = false;
      this.ensureAudioGraph();
    } else if (!this.slot && this.pool) {
      // 일반 경로 — 슬롯 acquire
      const slot = this.pool.acquire(this._data.assetId, this.id);
      if (slot) {
        this.slot = slot;
        this.ensureAudioGraph();
      }
    }

    // 클립 구간에 진입했을 때, 이미 재생 중이면 오디오 시작
    if (ctx.isPlaying && this._data.enabled && !this.isPlaying && this.slot) {
      this.debugCall('(Audio) starting because became visible while playing');
      this.startAt(ctx.currentTime, 'becameVisible');
    }
  }

  onBecameHidden(ctx: TickContext): void {
    this.debugCall('(Audio) became hidden');
    this._isPreWarmed = false;

    // 클립 구간을 벗어났을 때 오디오 정지
    if (this.isPlaying) {
      this.stop('becameHidden');
    }

    // 슬롯 반환 → 다른 클립이 사용 가능
    if (this.pool && this.slot) {
      this.pool.release(this.id);
      this.slot = null;
    }
  }

  onTick(ctx: TickContext): void {
    // Lazy slot acquisition — 첫 tick 시 onBecameVisible 이 불리지 않으므로 여기서 처리
    if (!this.slot && this.pool) {
      const slot = this.pool.acquire(this._data.assetId, this.id);
      if (slot) {
        this.slot = slot;
        this.ensureAudioGraph();
      }
    }

    if (!this.slot) return;

    if (!this._data.enabled) {
      if (this.isPlaying) this.stop('disabled');
      return;
    }

    const { isPlaying, currentTime, playStateChanged, isSeeking } = ctx;

    if (this.lastTickWasPlaying !== isPlaying) {
      this.debugCall(
        `(Audio) play state changed (playing: ${isPlaying}, seeking: ${isSeeking})`
      );
      this.lastTickWasPlaying = isPlaying;
    }

    // 재생 상태 변경 or 탐색 시에만 처리
    if (playStateChanged || isSeeking) {
      if (isPlaying) {
        if (!this.isPlaying) {
          this.debugCall(
            `(Audio) start requested (${isSeeking ? 'seeking' : 'playStateChanged'})`
          );
          this.startAt(currentTime, isSeeking ? 'seeking' : 'playStateChanged');
        }
      } else {
        if (this.isPlaying) {
          this.debugCall(
            `(Audio) stop requested (${playStateChanged ? 'playStateChanged' : 'seeking'})`
          );
          this.stop(playStateChanged ? 'playStateChanged' : 'seeking');
        }
      }
    }
  }

  destroy(): void {
    this.debugCall('(Audio) destroy');
    this.stop('destroy');

    // 슬롯 반환 (element 는 pool 이 관리)
    if (this.pool && this.slot) {
      this.pool.release(this.id);
      this.slot = null;
    }
  }

  // ── Private ──

  private async startAt(currentTime: number, reason: string) {
    this.debugCall(`(Audio) startAt(${currentTime}) reason=${reason}`);
    if (this.isPlaying) this.stop('restart');
    if (!this.slot) return;

    const ctx = this.renderer.audioContext;
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
        this.debugCall('(Audio) audio context resumed');
      } catch (e) {
        console.warn('[AudioClip] Failed to resume audio context', e);
        return;
      }
    }

    this.ensureAudioGraph();
    this.applyVolume();

    // 재생 위치 계산
    const trimStart = (this._data.trimStart ?? 0) / 1000;
    const offset = this.calcOffset(currentTime, trimStart);
    this.debugCall(`starting playback at ${offset.toFixed(2)}s (${reason})`);

    this.slot.audioEl.currentTime = offset;

    const playPromise = this.slot.audioEl.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.debugCall('(Audio) play started');
        })
        .catch((e) => {
          console.warn('[AudioClip] Play failed:', e);
          this.isPlaying = false;
        });
    } else {
      this.isPlaying = true;
    }
  }

  private stop(reason: string) {
    if (this.audioEl) {
      this.audioEl.pause();
    }
    if (this.isPlaying) {
      this.debugCall(`paused (${reason})`);
    }
    this.isPlaying = false;
  }

  private calcOffset(currentTime: number, trimStartSec: number): number {
    const base = Math.max(0, (currentTime - this._data.startTime) / 1000);
    return base + trimStartSec;
  }

  /** Audio Graph 를 슬롯에 세팅 (MediaSource → GainNode → Track.inputNode) */
  private ensureAudioGraph(): void {
    if (!this.slot) return;

    const ctx = this.renderer.audioContext;

    // MediaElementAudioSourceNode (한 AudioElement 에 1번만 생성 가능)
    if (!this.slot.mediaSourceNode) {
      this.slot.mediaSourceNode = ctx.createMediaElementSource(
        this.slot.audioEl
      );
    }

    // GainNode
    if (!this.slot.gainNode) {
      this.slot.gainNode = ctx.createGain();
    }

    // Connect: mediaSource → gainNode → track.inputNode (or masterNode)
    try {
      this.slot.mediaSourceNode.connect(this.slot.gainNode);
    } catch {
      // 이미 연결된 경우 무시
    }

    const track = this.trackId
      ? this.renderer.getTrack(this.trackId)
      : undefined;
    try {
      if (track) {
        this.slot.gainNode.connect(track.inputNode);
      } else {
        this.slot.gainNode.connect(this.renderer.masterNode);
      }
    } catch {
      // 이미 연결된 경우 무시
    }

    this.applyVolume();
  }

  private applyVolume(): void {
    if (this.slot?.gainNode) {
      this.slot.gainNode.gain.value = this._data.volume ?? 1;
    }
  }
}
