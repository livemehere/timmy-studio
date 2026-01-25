import type { IAudioTrack, IGraphicTrack, ITrack, TrackType } from './types';
import type { IClip } from '../Clip/types';
import type { TickContext, ClipSyncResult } from '@/lib/studio/engine/types';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import type { AudioRenderer } from '@/lib/studio/engine/AudioRenderer';
import type { AssetType } from '@/lib/studio/domains/Asset/types';
import { uid } from 'uid';

// 기본 트랙의 zIndex (위/아래로 최대 50개씩 트랙 추가 가능)
export const DEFAULT_TRACK_Z_INDEX = 50;

export abstract class Track<
  TTrackData extends ITrack = ITrack,
  TClipData extends IClip = IClip,
  TRenderer extends GraphicRenderer | AudioRenderer =
    | GraphicRenderer
    | AudioRenderer,
  TClipInstance extends {
    update: (data: TClipData) => void;
    destroy: () => void;
    tick: (ctx: TickContext) => void;
    init: () => Promise<void>;
    id: string;
  } = any,
> {
  readonly id: string;
  readonly clips = new Map<string, TClipInstance>();
  readonly renderer: TRenderer;

  protected constructor(renderer: TRenderer, data: { id: string }) {
    this.id = data.id;
    this.renderer = renderer;
  }

  protected abstract applyTrackProps(data: TTrackData): void;
  protected abstract addClip(data: TClipData): Promise<void>;
  protected abstract removeClip(clipId: string): void;
  protected abstract shouldTrackTick(): boolean;
  protected abstract createClipInstance(data: TClipData): TClipInstance;
  abstract destroy(): void;

  async sync(data: TTrackData): Promise<ClipSyncResult> {
    this.applyTrackProps(data);
    return this.syncClips(data.clips as TClipData[]);
  }
  protected async syncClips(newClips: TClipData[]): Promise<ClipSyncResult> {
    const newClipIds = new Set(newClips.map((c) => c.id));
    const addedClipIds: string[] = [];
    const updatedClipIds: string[] = [];
    const removedClipIds: string[] = [];
    const failedClipIds: string[] = [];

    // 1. 제거된 클립 처리
    for (const [clipId, _clip] of this.clips) {
      if (!newClipIds.has(clipId)) {
        this.removeClip(clipId);
        removedClipIds.push(clipId);
      }
    }

    // 2. 추가되거나 업데이트된 클립 처리
    const tasks = newClips.map(async (clipData) => {
      if (this.clips.has(clipData.id)) {
        try {
          const clip = this.clips.get(clipData.id);
          clip?.update(clipData);
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

  /** 렌더링 루프: 소속 클립들의 tick 실행 */
  tick(ctx: TickContext): void {
    if (!this.shouldTrackTick()) return;
    for (const clip of this.clips.values()) {
      clip.tick(ctx);
    }
  }

  /** 해당 타입의 가장 높은 z-order 를 가진 트랙을 반환 */
  static findFirstTrack(tracks: ITrack[], type: TrackType): ITrack | undefined {
    return tracks
      .filter((t) => t.type == type)
      .sort((a, b) => b.zIndex - a.zIndex)[0];
  }

  static getLastestClipEndTime(track: ITrack): number {
    const clips = track.clips;
    if (clips.length === 0) {
      return 0;
    }
    return Math.max(...clips.map((clip) => clip.endTime));
  }

  /** AssetType 을 TrackType 으로 좁힘 */
  static AssetTypeToTrackType(type: AssetType): TrackType {
    if (type === 'audio') return 'audio';
    return 'graphic';
  }

  static create(type: TrackType) {
    if (type === 'graphic') {
      const track: IGraphicTrack = {
        id: uid(8),
        name: 'New Graphic Track',
        zIndex: DEFAULT_TRACK_Z_INDEX,
        type: 'graphic',
        enabled: true,
        locked: false,
        clips: [],
        opacity: 1,
      };
      return track;
    } else {
      const track: IAudioTrack = {
        id: uid(8),
        name: 'New Audio Track',
        zIndex: DEFAULT_TRACK_Z_INDEX,
        type: 'audio',
        enabled: true,
        locked: false,
        clips: [],
        volume: 1,
      };
      return track;
    }
  }
}
