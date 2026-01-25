import type { IAudioTrack } from './types';
import type { AudioRenderer } from '@/lib/studio/engine/AudioRenderer';
import { AudioClip } from '../Clip/AudioClip';
import type { IAudioClip } from '../Clip/types';
import { Track } from './Track';

export class AudioTrack extends Track<
  IAudioTrack,
  IAudioClip,
  AudioRenderer,
  AudioClip
> {
  inputNode: GainNode; // 클립들이 여기로 연결됨
  outputNode: GainNode; // 최종적으로 Master로 연결됨
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
    await clip.init();
  }

  protected removeClip(clipId: string): void {
    const clip = this.clips.get(clipId);
    if (clip) {
      clip.destroy();
      this.clips.delete(clipId);
    }
  }

  protected shouldTrackTick(): boolean {
    return this.data.enabled;
  }

  destroy(): void {
    for (const clip of this.clips.values()) {
      clip.destroy();
    }
    this.clips.clear();

    this.inputNode.disconnect();
    this.outputNode.disconnect();
  }

  protected createClipInstance(data: IAudioClip): AudioClip {
    return new AudioClip(this.renderer, data, this.id);
  }
}
