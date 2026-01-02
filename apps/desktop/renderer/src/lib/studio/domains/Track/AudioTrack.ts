import type { IAudioTrack } from './types';
import type { AudioRenderer } from '@renderer/lib/studio/core/AudioRenderer';
import { AudioClip } from '../Clip/AudioClip';
import type { TickContext } from '@renderer/lib/studio/core/types';
import type { IAudioClip } from '../Clip/types';

export class AudioTrack {
  public id: string;
  public clips = new Map<string, AudioClip>();

  // Audio Graph
  public inputNode: GainNode; // 클립들이 여기로 연결됨
  public outputNode: GainNode; // 최종적으로 Master로 연결됨

  constructor(
    private renderer: AudioRenderer,
    data: IAudioTrack
  ) {
    this.id = data.id;

    const ctx = renderer.audioContext;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Input -> Output 연결
    this.inputNode.connect(this.outputNode);
    // Output -> Master 연결
    this.outputNode.connect(renderer.masterNode);

    this.updateProps(data);
  }

  async sync(data: IAudioTrack): Promise<void> {
    this.updateProps(data);
    await this.syncClips(data.clips);
  }

  private updateProps(data: IAudioTrack) {
    // Volume 적용
    const volume = data.enabled ? (data.volume ?? 1) : 0;
    this.outputNode.gain.value = volume;
  }

  private async syncClips(clipsData: IAudioClip[]): Promise<void> {
    const newClipIds = new Set(clipsData.map((c) => c.id));

    // 제거
    for (const [clipId, clip] of this.clips) {
      if (!newClipIds.has(clipId)) {
        clip.destroy();
        this.clips.delete(clipId);
      }
    }

    // 추가/업데이트
    const tasks: Promise<void>[] = [];
    for (const clipData of clipsData) {
      // clipData에 trackId 주입 (AudioClip에서 찾을 수 있도록)
      const dataWithTrackId = { ...clipData, trackId: this.id };

      if (this.clips.has(clipData.id)) {
        this.clips.get(clipData.id)?.update(dataWithTrackId);
      } else {
        const clip = new AudioClip(this.renderer, dataWithTrackId);
        this.clips.set(clipData.id, clip);
        tasks.push(clip.init());
      }
    }
    await Promise.all(tasks);
  }

  tick(ctx: TickContext): void {
    for (const clip of this.clips.values()) {
      clip.tick(ctx);
    }
  }

  destroy(): void {
    for (const clip of this.clips.values()) {
      clip.destroy();
    }
    this.clips.clear();

    this.inputNode.disconnect();
    this.outputNode.disconnect();
  }
}
