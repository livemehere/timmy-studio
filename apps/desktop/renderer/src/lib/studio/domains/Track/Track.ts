import { Container } from 'pixi.js';
import { uid } from 'uid';
import type { Renderer } from '@renderer/lib/studio/engine/Renderer';
import type { IGraphicTrack, ITrack, TrackType, IAudioTrack } from './types';
import type { TickContext } from '@renderer/lib/studio/engine/types';
import type {
  IGraphicClip,
  ClipType,
  IVideoClip,
  IImageClip,
  ITextClip,
  IShapeClip,
} from '@renderer/lib/studio/domains/Clip/types';
import type { AssetType } from '@renderer/lib/studio/domains/Asset/types';
import {
  VideoClip,
  ImageClip,
  TextClip,
  ShapeClip,
  GraphicClip,
} from '@renderer/lib/studio/domains/Clip';

export class Track {
  public id: string;
  public container: Container;
  public clips = new Map<string, GraphicClip>();

  static readonly LABELS = {
    TRACK_PREFIX: 'Track-',
  };

  constructor(
    private renderer: Renderer,
    data: IGraphicTrack
  ) {
    this.id = data.id;
    this.container = new Container();
    this.container.label = `${Track.LABELS.TRACK_PREFIX}${this.id}`;

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

  /** 해당 타읩의 가장 높은 z-order 를 가진 트랙을 반환 */
  static findFirstTrack(tracks: ITrack[], type: TrackType): ITrack | undefined {
    return tracks
      .filter((t) => t.type == type)
      .sort((a, b) => b.zIndex - a.zIndex)[0];
  }

  /** AssetType 을 TrackType 으로 좁힘 */
  static AssetTypeToTrackType(type: AssetType): TrackType {
    if (type === 'audio') return 'audio';
    return 'graphic';
  }

  static ClipTypeToTrackType(type: ClipType): TrackType {
    if (type === 'audio') return 'audio';
    return 'graphic';
  }

  static createTrackData(type: TrackType) {
    if (type === 'graphic') {
      return {
        id: uid(8),
        name: 'New Graphic Track',
        zIndex: 0,
        type: 'graphic',
        enabled: true,
        locked: false,
        clips: [],
        opacity: 1,
      } as IGraphicTrack;
    } else {
      return {
        id: uid(8),
        name: 'New Audio Track',
        zIndex: 0,
        type: 'audio',
        enabled: true,
        locked: false,
        clips: [],
        volume: 1,
      } as IAudioTrack;
    }
  }

  static getLastestClipEndTime(track: ITrack): number {
    const clips = track.clips;
    if (clips.length === 0) {
      return 0;
    }
    return Math.max(...clips.map((clip) => clip.endTime));
  }
}
