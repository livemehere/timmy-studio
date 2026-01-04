import { Container } from 'pixi.js';
import type { GraphicRenderer } from '@renderer/lib/studio/engine/GraphicRenderer';
import type { IGraphicTrack } from './types';
import type { TickContext } from '@renderer/lib/studio/engine/types';
import type {
  IGraphicClip,
  IVideoClip,
  IImageClip,
  ITextClip,
  IShapeClip,
} from '@renderer/lib/studio/domains/Clip/types';
import {
  VideoClip,
  ImageClip,
  TextClip,
  ShapeClip,
  GraphicClip,
} from '@renderer/lib/studio/domains/Clip';
import { Track } from './Track';

export class GraphicTrack extends Track<
  IGraphicClip,
  GraphicRenderer,
  GraphicClip
> {
  public container: Container;

  static readonly LABELS = {
    TRACK_PREFIX: 'Track-',
  };

  constructor(renderer: GraphicRenderer, data: IGraphicTrack) {
    super(renderer, data);
    this.container = new Container();
    this.container.label = `${GraphicTrack.LABELS.TRACK_PREFIX}${this.id}`;

    // 초기 속성 설정
    this.updateContainerProps(data);
  }

  /** 트랙 속성 및 내부 클립들을 동기화합니다. */
  async sync(data: IGraphicTrack): Promise<void> {
    this.updateContainerProps(data);
    await this.syncClips(data.clips);
  }

  private updateContainerProps(data: IGraphicTrack) {
    if (this.container.visible !== data.enabled)
      this.container.visible = data.enabled;
    if (this.container.alpha !== data.opacity)
      this.container.alpha = data.opacity;
    if (this.container.zIndex !== data.zIndex)
      this.container.zIndex = data.zIndex;
  }

  protected async addClip(data: IGraphicClip): Promise<void> {
    const clip = this.createClipInstance(data);
    this.clips.set(data.id, clip);

    await clip.init();

    // 클립 마운트
    clip.mount(this.container);
  }

  protected removeClip(clipId: string): void {
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
    super.tick(ctx);
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
  private createClipInstance(data: IGraphicClip): GraphicClip {
    switch (data.type) {
      case 'video':
        return new VideoClip(this.renderer, data as IVideoClip);
      case 'image':
        return new ImageClip(this.renderer, data as IImageClip);
      case 'text':
        return new TextClip(this.renderer, data as ITextClip);
      case 'shape':
        return new ShapeClip(this.renderer, data as IShapeClip);
      default:
        throw new Error(`Unsupported clip type: ${(data as any).type}`);
    }
  }

  // --------------------------------------------------------------------------
  // Static Utility Methods (Moved from TrackUtils)
  // --------------------------------------------------------------------------
}
