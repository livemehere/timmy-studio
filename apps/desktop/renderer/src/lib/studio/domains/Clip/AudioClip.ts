import type { IAudioClip } from './types';
import type { AudioRenderer } from '@/lib/studio/engine/AudioRenderer';
import { toFilePath } from '@/lib/studio/utils/toFilePath';
import { Clip } from './Clip';
import type { TickContext } from '@/lib/studio/engine/types';

/**
 * AudioClip - HTMLAudioElement 기반 스트리밍 재생
 *
 * 대용량 오디오 파일 지원을 위해 MediaElementAudioSourceNode 사용
 * - AudioBuffer 방식: 전체 파일을 메모리에 로드 (1시간 = ~600MB)
 * - MediaElement 방식: 스트리밍으로 재생 (메모리 절약)
 */
export class AudioClip extends Clip {
  readonly type = 'audio';
  public data: IAudioClip;
  declare public readonly renderer: AudioRenderer;

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

  constructor(renderer: AudioRenderer, data: IAudioClip, trackId: string) {
    super(renderer, data);
    this.data = data;
    this.trackId = trackId;
  }

  async init(): Promise<void> {
    const asset = this.renderer
      .getDoc()
      .assets.find((a: any) => a.id === this.data.assetId);
    if (!asset || asset.type !== 'audio') {
      throw new Error(
        `[AudioClip] Asset not found or invalid: ${this.data.assetId}`
      );
    }

    this.filePath = asset.filePath;
    console.log(`[AudioClip] Initialized for ${this.id}`);
  }

  update(data: IAudioClip): void {
    this.data = data;
    // 볼륨 등 업데이트
    if (this.gainNode) {
      this.gainNode.gain.value = data.volume ?? 1;
    }
  }

  destroy(): void {
    this.stop();

    // Audio Element 정리
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement.load(); // 메모리 해제
      this.audioElement = null;
    }

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

  // 오디오는 매 프레임 tick보다는 상태 변화(재생/정지/탐색) 시점에 반응하는 것이 중요함.
  tick(ctx: TickContext): void {
    if (!this.filePath) return;

    if (!this.data.enabled) {
      if (this.isPlaying) {
        this.stop();
      }
      return;
    }

    const { isPlaying, currentTime, playStateChanged, isSeeking } = ctx;
    const isVisible = this.shouldRender(currentTime);

    // 1. 재생 상태 변경 or 탐색 시
    if (playStateChanged || isSeeking) {
      if (isPlaying && isVisible) {
        // 재생 시작
        this.play(currentTime);
      } else {
        // 정지
        this.stop();
      }
      return;
    }

    // 2. 재생 중인데 구간을 벗어남 -> 정지
    if (isPlaying && !isVisible && this.isPlaying) {
      this.stop();
    }

    // 3. 재생 중인데 구간에 진입 -> 재생
    if (isPlaying && isVisible && !this.isPlaying) {
      this.play(currentTime);
    }
  }

  private async play(currentTime: number) {
    if (this.isPlaying) this.stop(); // 이미 재생 중이면 일단 멈춤 (Seek 등 대응)
    if (!this.filePath) return;

    const ctx = this.renderer.audioContext;
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('[AudioClip] Failed to resume audio context', e);
        return;
      }
    }

    // Audio Element 생성 (처음에만)
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.preload = 'metadata'; // 메타데이터만 로드 (메모리 절약)
      this.audioElement.crossOrigin = 'anonymous'; // CORS 지원
      this.audioElement.src = toFilePath(this.filePath);
      this.audioElement.loop = false;

      // 에러 핸들링
      this.audioElement.onerror = (e) => {
        console.error('[AudioClip] Audio element error:', e);
      };
    }

    // MediaElementSourceNode 생성 (처음에만)
    if (!this.mediaSourceNode) {
      this.mediaSourceNode = ctx.createMediaElementSource(this.audioElement);
    }

    const gainNode = (this.gainNode ??= ctx.createGain());

    // 그래프 연결: MediaSource -> Gain -> Track Input
    this.mediaSourceNode.connect(gainNode);

    // 부모 트랙 찾기
    const track = this.trackId
      ? this.renderer.getTrack(this.trackId)
      : undefined;
    if (track) {
      gainNode.connect(track.inputNode);
    } else {
      // Fallback: Track을 못 찾으면 Master로 직결
      gainNode.connect(this.renderer.masterNode);
    }

    // 볼륨 설정
    gainNode.gain.value = this.data.volume ?? 1;

    // 재생 위치 계산
    // Clip 시작 시간: this.data.startTime
    // 오디오 파일 내 시작점: this.data.trimStart (없으면 0)
    // 현재 커서 위치: currentTime
    const trimStart = (this.data.trimStart ?? 0) / 1000; // ms -> s
    const offset =
      Math.max(0, (currentTime - this.data.startTime) / 1000) + trimStart;

    // Audio Element의 currentTime 설정 및 재생
    this.audioElement.currentTime = offset;

    // 재생 시작
    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
        })
        .catch((e) => {
          console.warn('[AudioClip] Play failed:', e);
          this.isPlaying = false;
        });
    } else {
      this.isPlaying = true;
    }
  }

  private stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.isPlaying = false;
    }
  }
}
