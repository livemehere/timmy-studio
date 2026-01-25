import type { IAudioTrack } from './types';
import type { AudioRenderer } from '@/lib/studio/engine/AudioRenderer';
import { AudioClip } from '../Clip/AudioClip';
import type { IAudioClip } from '../Clip/types';
import { Track } from './Track';
import type { ClipSyncResult } from '@/lib/studio/engine/types';

export class AudioTrack extends Track<IAudioClip, AudioRenderer, AudioClip> {
  // Audio Graph
  public inputNode: GainNode; // 클립들이 여기로 연결됨
  public outputNode: GainNode; // 최종적으로 Master로 연결됨

  // Track data
  public data: IAudioTrack;

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

  async sync(data: IAudioTrack): Promise<ClipSyncResult> {
    this.data = data;
    this.updateProps(data);
    return this.syncClips(data.clips);
  }

  private updateProps(data: IAudioTrack) {
    // Volume 적용
    const volume = data.enabled ? (data.volume ?? 1) : 0;
    this.outputNode.gain.value = volume;
  }

  protected async addClip(data: IAudioClip): Promise<void> {
    const dataWithTrackId = { ...data, trackId: this.id };
    const clip = new AudioClip(this.renderer, dataWithTrackId);
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

  /**
   * Override syncClips to inject trackId into clip data.
   * Or we can just let addClip handle new clips, and update existing ones.
   */
  protected async syncClips(clipsData: IAudioClip[]): Promise<ClipSyncResult> {
    const newClipIds = new Set(clipsData.map((c) => c.id));
    const addedClipIds: string[] = [];
    const updatedClipIds: string[] = [];
    const removedClipIds: string[] = [];
    const failedClipIds: string[] = [];

    // 1. 제거된 클립 처리
    for (const [clipId, clip] of this.clips) {
      if (!newClipIds.has(clipId)) {
        clip.destroy();
        this.clips.delete(clipId);
        removedClipIds.push(clipId);
      }
    }

    // 2. 추가되거나 업데이트된 클립 처리
    const tasks = clipsData.map(async (clipData) => {
      // trackId 주입
      const dataWithTrackId = { ...clipData, trackId: this.id };

      if (this.clips.has(clipData.id)) {
        try {
          this.clips.get(clipData.id)?.update(dataWithTrackId);
          updatedClipIds.push(clipData.id);
        } catch (error) {
          failedClipIds.push(clipData.id);
        }
        return;
      }

      try {
        await this.addClip(clipData);
        addedClipIds.push(clipData.id);
      } catch (error) {
        failedClipIds.push(clipData.id);
      }
    });
    await Promise.all(tasks);

    return {
      addedClipIds,
      updatedClipIds,
      removedClipIds,
      failedClipIds,
    };
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
