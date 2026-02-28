import type { IAudioTrack } from './types';
import type { AudioRenderer } from '@/lib/studio/engine/AudioRenderer';
import { TrackAudioPool } from '@/lib/studio/engine/TrackAudioPool';
import type { TickContext } from '@/lib/studio/engine/types';
import { AudioClip } from '../Clip/AudioClips/AudioClip';
import type { IAudioClip } from '../Clip/types';
import type { IAudioAsset } from '@/lib/studio/domains/Asset/types';
import { Clip } from '@/lib/studio/domains/Clip/Clip';
import { Track } from './Track';

export class AudioTrack extends Track<
  IAudioTrack,
  IAudioClip,
  AudioRenderer,
  AudioClip
> {
  inputNode: GainNode; // 클립들이 여기로 연결됨
  outputNode: GainNode; // 최종적으로 Master로 연결됨
  /** 이 트랙 내 AudioClip 들이 공유하는 audio element pool */
  public readonly audioPool = new TrackAudioPool();
  data: IAudioTrack;

  constructor(renderer: AudioRenderer, data: IAudioTrack) {
    super(renderer, data);
    this.data = data;

    const ctx = renderer.audioContext;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Input -> Output 연결
    this.inputNode.connect(this.outputNode);
    // Output -> Master 연결
    this.outputNode.connect(renderer.masterNode);
  }

  protected applyTrackProps(data: IAudioTrack): void {
    this.data = data;
    const volume = data.enabled ? (data.volume ?? 1) : 0;
    this.outputNode.gain.value = volume;
  }

  protected async addClip(data: IAudioClip): Promise<void> {
    const clip = this.createClipInstance(data);
    this.clips.set(data.id, clip);

    // Pool 에 asset 준비 & pool 주입
    const asset = this.renderer
      .getDoc()
      .assets.find((a) => a.id === data.assetId) as IAudioAsset | undefined;
    if (asset && asset.type === 'audio') {
      await this.audioPool.ensureAsset(asset);
    }
    clip.setPool(this.audioPool);

    await clip.init();
  }

  protected removeClip(clipId: string): void {
    const clip = this.clips.get(clipId);
    if (clip) {
      clip.destroy();
      this.clips.delete(clipId);
    }
  }

  protected isTrackVisible(): boolean {
    return this.data.enabled;
  }

  // 오디오는 굳이 처리할 거 없음.
  protected onTrackBecameVisible(): void {
    // No-op: audio nodes are already connected
  }

  protected onTrackBecameHidden(): void {
    // When hidden, output is already silenced via applyTrackProps
  }

  // ── Pre-warm (이중 버퍼) ──

  override onTick(ctx: TickContext): void {
    super.onTick(ctx);
    this.handleAudioPreWarm(ctx);
  }

  /**
   * 재생 중: 다음에 재생될 AudioClip 을 미리 준비 (이중 버퍼).
   * 정지/시킹: pre-warm 해제하여 슬롯 절약.
   */
  private handleAudioPreWarm(ctx: TickContext): void {
    const { currentTime, isPlaying } = ctx;

    // AudioClip 수집
    const audioClips: AudioClip[] = [];
    for (const clip of this.clips.values()) {
      audioClips.push(clip);
    }
    if (audioClips.length < 2) return;

    if (!isPlaying) {
      // 정지 상태 — 모든 pre-warm 해제
      for (const ac of audioClips) {
        if (ac.isPreWarmed) ac.releasePreWarm();
      }
      return;
    }

    // 재생 중 — 시간순 정렬 후 "다음 클립" 찾기
    const sorted = [...audioClips].sort((a, b) => {
      const aStart = a.data.startTime + (a.data.trimStart ?? 0);
      const bStart = b.data.startTime + (b.data.trimStart ?? 0);
      return aStart - bStart;
    });

    let nextClip: AudioClip | null = null;
    for (const ac of sorted) {
      const { start: actualStart, end: actualEnd } = Clip.getActualTimeRange(
        ac.data
      );
      // 이미 지난 클립 스킵
      if (actualEnd <= currentTime) continue;
      // 현재 재생 중인 클립 스킵
      if (currentTime >= actualStart && currentTime < actualEnd) continue;
      // 다음 클립 발견
      nextClip = ac;
      break;
    }

    // 더 이상 "다음"이 아닌 pre-warm 해제
    for (const ac of audioClips) {
      if (ac.isPreWarmed && ac !== nextClip) {
        ac.releasePreWarm();
      }
    }

    // 다음 클립 pre-warm
    if (nextClip && !nextClip.isPreWarmed && !nextClip.hasSlot) {
      nextClip.preWarm();
    }
  }

  destroy(): void {
    for (const clip of this.clips.values()) {
      clip.destroy();
    }
    this.clips.clear();

    // audio element pool 정리
    this.audioPool.destroy();

    this.inputNode.disconnect();
    this.outputNode.disconnect();
  }

  protected createClipInstance(data: IAudioClip): AudioClip {
    return new AudioClip(this.renderer, data, this.id);
  }
}
