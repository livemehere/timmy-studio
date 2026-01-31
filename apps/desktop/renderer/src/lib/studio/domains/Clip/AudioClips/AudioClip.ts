import type { IAudioClip } from '../types';
import type { AudioRenderer } from '@/lib/studio/engine/AudioRenderer';
import { toFilePath } from '@/lib/studio/utils/toFilePath';
import { Clip } from '../Clip';
import type { TickContext } from '@/lib/studio/engine/types';

/**
 * AudioClip - HTMLAudioElement 기반 스트리밍 재생
 *
 * 대용량 오디오 파일 지원을 위해 MediaElementAudioSourceNode 사용
 * - AudioBuffer 방식: 전체 파일을 메모리에 로드 (1시간 = ~600MB)
 * - MediaElement 방식: 스트리밍으로 재생 (메모리 절약)
 */
export class AudioClip extends Clip<IAudioClip, AudioRenderer> {
  readonly type = 'audio';

  // Audio Graph - MediaElement 방식 (대용량 파일 스트리밍 지원)
  private audioElement: HTMLAudioElement | null = null;
  private gainNode: GainNode | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;

  public get outputNode(): GainNode | null {
    return this.gainNode;
  }

  // State
  private isPlaying = false;
  private filePath: string | null = null;
  private trackId: string | null = null;
  private lastTickWasPlaying: boolean | null = null;

  constructor(renderer: AudioRenderer, data: IAudioClip, trackId: string) {
    super(renderer, data);
    this.trackId = trackId;
    this.debugCall(`(Audio) constructed`);
  }

  async init(): Promise<void> {
    this.debugCall('(Audio) === init ===');
    const asset = this.renderer
      .getDoc()
      .assets.find((a: any) => a.id === this._data.assetId);
    if (!asset || asset.type !== 'audio') {
      throw new Error(
        `[AudioClip] Asset not found or invalid: ${this._data.assetId}`
      );
    }

    this.filePath = asset.filePath;

    // VideoClip init과 동일하게 미리 Audio Element 준비
    this.audioElement = this.createAudioElement(this.filePath);

    this.sync(this.data);
    this.debugCall('(Audio) === init-end ===');
  }

  protected applyData(): void {
    // 볼륨 등 업데이트
    if (this.gainNode) {
      this.gainNode.gain.value = this.data.volume ?? 1;
    }
  }

  sync(data: IAudioClip): void {
    this.debugCall('(Audio) sync');
    this._data = data;
    this.applyData();
  }

  onBecameVisible(_ctx: TickContext): void {
    this.debugCall('(Audio) became visible');
  }

  onBecameHidden(_ctx: TickContext): void {
    this.debugCall('(Audio) became hidden');
  }

  // 오디오는 매 프레임 tick보다는 상태 변화(재생/정지/탐색) 시점에 반응하는 것이 중요함.
  onTick(ctx: TickContext): void {
    if (!this.filePath) return;

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

    // Audio Element 정리
    this.disposeAudioElement();

    // Audio Graph 정리
    if (this.mediaSourceNode) {
      this.mediaSourceNode.disconnect();
      this.mediaSourceNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    this.filePath = null;
  }

  private async startAt(currentTime: number, reason: string) {
    this.debugCall(`(Audio) startAt(${currentTime}) reason=${reason}`);
    if (this.isPlaying) this.stop('restart');
    if (!this.filePath) return;

    const ctx = this.renderer.audioContext;
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
        this.debugCall('(Audio) audio context resumed');
      } catch (e) {
        console.warn('[AudioClip] Failed to resume audio context', e);
        this.debugCall('(Audio) audio context resume failed');
        return;
      }
    }

    const audioEl = this.ensureAudioElement();
    const mediaSource = this.ensureMediaSource(ctx, audioEl);
    const gainNode = this.ensureGainNode(ctx);
    this.connectGraph(mediaSource, gainNode);
    this.applyVolume(gainNode);

    // 재생 위치 계산
    // Clip 시작 시간: this.data.startTime
    // 오디오 파일 내 시작점: this.data.trimStart (없으면 0)
    // 현재 커서 위치: currentTime
    const trimStart = (this._data.trimStart ?? 0) / 1000; // ms -> s
    const offset = this.calcOffset(currentTime, trimStart);
    this.debugCall(`starting playback at ${offset.toFixed(2)}s (${reason})`);

    // Audio Element의 currentTime 설정 및 재생
    audioEl.currentTime = offset;

    // 재생 시작
    const playPromise = audioEl.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.debugCall('(Audio) play started');
        })
        .catch((e) => {
          console.warn('[AudioClip] Play failed:', e);
          this.debugCall(`(Audio) play failed: ${e?.message ?? e}`);
          this.isPlaying = false;
        });
    } else {
      this.isPlaying = true;
      this.debugCall('(Audio) play started (no promise)');
    }
  }

  private stop(reason: string) {
    if (this.audioElement) {
      this.audioElement.pause();
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

  private createAudioElement(filePath: string): HTMLAudioElement {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    audio.src = toFilePath(filePath);
    audio.loop = false;
    audio.onerror = (e) => {
      console.error('[AudioClip] Audio element error:', e);
    };
    return audio;
  }

  private ensureAudioElement(): HTMLAudioElement {
    if (!this.audioElement) {
      this.audioElement = this.createAudioElement(this.filePath!);
    }
    return this.audioElement;
  }

  private ensureMediaSource(
    ctx: AudioContext,
    audioEl: HTMLAudioElement
  ): MediaElementAudioSourceNode {
    if (!this.mediaSourceNode) {
      this.mediaSourceNode = ctx.createMediaElementSource(audioEl);
    }
    return this.mediaSourceNode;
  }

  private ensureGainNode(ctx: AudioContext): GainNode {
    return (this.gainNode ??= ctx.createGain());
  }

  private connectGraph(
    mediaSource: MediaElementAudioSourceNode,
    gainNode: GainNode
  ): void {
    mediaSource.connect(gainNode);

    const track = this.trackId
      ? this.renderer.getTrack(this.trackId)
      : undefined;
    if (track) {
      gainNode.connect(track.inputNode);
    } else {
      gainNode.connect(this.renderer.masterNode);
    }
  }

  private applyVolume(gainNode: GainNode): void {
    gainNode.gain.value = this._data.volume ?? 1;
  }

  private disposeAudioElement(): void {
    if (!this.audioElement) return;
    this.debugCall('(Audio) dispose audio element');
    this.audioElement.pause();
    this.audioElement.src = '';
    this.audioElement.load();
    this.audioElement = null;
  }
}
