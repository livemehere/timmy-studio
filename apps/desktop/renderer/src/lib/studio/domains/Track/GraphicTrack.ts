import { Container } from 'pixi.js';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import { TrackVideoPool } from '@/lib/studio/engine/TrackVideoPool';
import type { IGraphicTrack } from './types';
import type {
  IGraphicClip,
  IVideoClip,
  IImageClip,
  ITextClip,
  IShapeClip,
} from '@/lib/studio/domains/Clip/types';
import type { IVideoAsset } from '@/lib/studio/domains/Asset/types';
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
  /** 이 트랙 내 VideoClip 들이 공유하는 video element pool */
  public readonly videoPool = new TrackVideoPool();

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

    // VideoClip → pool 에 asset 준비 & pool 주입
    if (clip instanceof VideoClip) {
      const videoData = data as IVideoClip;
      const asset = this.renderer
        .getDoc()
        .assets.find((a) => a.id === videoData.assetId) as
        | IVideoAsset
        | undefined;
      if (asset && asset.type === 'video') {
        await this.videoPool.ensureAsset(asset);
      }
      clip.setPool(this.videoPool);
    }

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

  protected isTrackVisible(): boolean {
    // 트랙이 비활성화 상태면 클립 업데이트 스킵 가능 (선택 사항)
    return this.container.visible;
  }

  protected onTrackBecameVisible(): void {
    this.container.visible = true;
  }

  protected onTrackBecameHidden(): void {
    this.container.visible = false;
  }

  destroy(): void {
    // 모든 클립 제거
    for (const clipId of this.clips.keys()) {
      this.removeClip(clipId);
    }
    this.clips.clear();

    // video element pool 정리
    this.videoPool.destroy();

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
