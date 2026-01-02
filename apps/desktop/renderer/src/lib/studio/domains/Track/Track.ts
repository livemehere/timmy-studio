import { Container } from 'pixi.js';
import type { Renderer } from '@renderer/lib/studio/core/Renderer';
import type { IVideoTrack } from './types';
import type { TickContext } from '@renderer/lib/studio/core/types';
import type { IGraphicClip } from '@renderer/lib/studio/domains/Clip/types';
import {
  Clip,
  VideoClip,
  ImageClip,
  TextClip,
  ShapeClip,
} from '@renderer/lib/studio/domains/Clip';

export class Track {
  public id: string;
  public container: Container;
  public clips = new Map<string, Clip>();

  static readonly LABELS = {
    TRACK_PREFIX: 'Track-',
    CLIP_PREFIX: 'Clip-',
  };

  constructor(
    private renderer: Renderer,
    data: IVideoTrack
  ) {
    this.id = data.id;
    this.container = new Container();
    this.container.label = `${Track.LABELS.TRACK_PREFIX}${this.id}`;

    // 초기 속성 설정
    this.updateContainerProps(data);
  }

  /** 트랙 속성 및 내부 클립들을 동기화합니다. */
  async sync(data: IVideoTrack): Promise<void> {
    this.updateContainerProps(data);
    await this.syncClips(data.clips);
  }

  private updateContainerProps(data: IVideoTrack) {
    if (this.container.visible !== data.enabled)
      this.container.visible = data.enabled;
    if (this.container.alpha !== data.opacity)
      this.container.alpha = data.opacity;
    if (this.container.zIndex !== data.zIndex)
      this.container.zIndex = data.zIndex;
  }

  /** 트랙 내의 클립들을 동기화합니다. */
  private async syncClips(clipsData: IGraphicClip[]): Promise<void> {
    const newClipIds = new Set(clipsData.map((c) => c.id));

    // 1. 제거된 클립 처리
    for (const [clipId, _clip] of this.clips) {
      if (!newClipIds.has(clipId)) {
        this.removeClip(clipId);
      }
    }

    // 2. 추가되거나 업데이트된 클립 처리
    const tasks: Promise<void>[] = [];
    for (const clipData of clipsData) {
      if (this.clips.has(clipData.id)) {
        const clip = this.clips.get(clipData.id);
        clip?.update(clipData);
      } else {
        tasks.push(this.addClip(clipData));
      }
    }
    await Promise.all(tasks);
  }

  private async addClip(data: IGraphicClip): Promise<void> {
    const clip = this.createClipInstance(data);
    this.clips.set(data.id, clip);

    await clip.init();

    // 클립 마운트
    clip.mount(this.container);
  }

  private removeClip(clipId: string): void {
    const clip = this.clips.get(clipId);
    if (clip) {
      clip.unmount();
      clip.destroy();
      this.clips.delete(clipId);
    }
  }

  /** 렌더링 루프: 소속 클립들의 tick 실행 */
  tick(ctx: TickContext): void {
    // 트랙이 비활성화 상태면 클립 업데이트 스킵 가능 (선택 사항)
    if (!this.container.visible) return;

    for (const clip of this.clips.values()) {
      clip.tick(ctx);
    }
  }

  destroy(): void {
    // 모든 클립 제거
    for (const clipId of this.clips.keys()) {
      this.removeClip(clipId);
    }
    this.clips.clear();

    // 컨테이너 제거
    this.container.destroy({ children: true });
  }

  // --------------------------------------------------------------------------
  // Factory Method (Moved from SceneManager)
  // --------------------------------------------------------------------------
  private createClipInstance(data: IGraphicClip): Clip {
    switch (data.type) {
      case 'video':
        return new VideoClip(this.renderer, data as any);
      case 'image':
        return new ImageClip(this.renderer, data as any);
      case 'text':
        return new TextClip(this.renderer, data as any);
      case 'shape':
        return new ShapeClip(this.renderer, data as any);
      default:
        throw new Error(`Unsupported clip type: ${(data as any).type}`);
    }
  }
}
