import { Container } from 'pixi.js';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import type { IGraphicTrack } from './types';
import type {
  IGraphicClip,
  IVideoClip,
  IImageClip,
  ITextClip,
  IShapeClip,
} from '@/lib/studio/domains/Clip/types';
import {
  VideoClip,
  ImageClip,
  TextClip,
  ShapeClip,
  GraphicClip,
} from '@/lib/studio/domains/Clip';
import { Track } from './Track';

export class GraphicTrack extends Track<
  IGraphicTrack,
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
  }

  protected applyTrackProps(data: IGraphicTrack): void {
    // GraphicTrack 은 data 를 저장할 필요 없음. this.container 가 곧 데이터
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

  protected shouldTrackTick(): boolean {
    // 트랙이 비활성화 상태면 클립 업데이트 스킵 가능 (선택 사항)
    return this.container.visible;
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

  protected createClipInstance(data: IGraphicClip): GraphicClip {
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
}
