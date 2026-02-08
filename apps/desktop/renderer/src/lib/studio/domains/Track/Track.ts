import type { IAudioTrack, IGraphicTrack, ITrack, TrackType } from './types';
import type { IClip } from '../Clip/types';
import type { TickContext, ClipSyncResult } from '@/lib/studio/engine/types';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import type { AudioRenderer } from '@/lib/studio/engine/AudioRenderer';
import type { AssetType } from '@/lib/studio/domains/Asset/types';
import { uid } from 'uid';
import type { Clip } from '../Clip';

// 기본 트랙의 zIndex (위/아래로 최대 50개씩 트랙 추가 가능)
export const DEFAULT_GRAPHIC_TRACK_Z_INDEX = 0;
export const DEFAULT_AUDIO_TRACK_Z_INDEX = -1;

export abstract class Track<
  TTrackData extends ITrack = ITrack,
  TClipData extends IClip = IClip,
  TRenderer extends GraphicRenderer | AudioRenderer =
    | GraphicRenderer
    | AudioRenderer,
  TClipInstance extends Clip<TClipData, TRenderer> = Clip<TClipData, TRenderer>,
> {
  readonly id: string;
  readonly clips = new Map<string, TClipInstance>();
  readonly renderer: TRenderer;
  private lastVisible = false;
  private hasVisibilityState = false;

  protected constructor(renderer: TRenderer, data: { id: string }) {
    this.id = data.id;
    this.renderer = renderer;
  }

  protected abstract applyTrackProps(data: TTrackData): void;
  protected abstract addClip(data: TClipData): Promise<void>;
  protected abstract removeClip(clipId: string): void;
  protected abstract isTrackVisible(): boolean;
  protected abstract createClipInstance(data: TClipData): TClipInstance;
  abstract destroy(): void;
  protected abstract onTrackBecameVisible(): void;
  protected abstract onTrackBecameHidden(): void;

  private handleTrackVisible(): boolean {
    const isVisible = this.isTrackVisible();
    if (!this.hasVisibilityState) {
      this.hasVisibilityState = true;
      this.lastVisible = isVisible;
      return isVisible;
    }

    if (isVisible && !this.lastVisible) {
      this.onTrackBecameVisible();
    }
    if (!isVisible && this.lastVisible) {
      this.onTrackBecameHidden();
    }
    this.lastVisible = isVisible;
    return isVisible;
  }

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
          clip?.sync(clipData);
          updatedClipIds.push(clipData.id);
        } catch (error) {
          console.error(
            `[Track] clip(${clipData.id}) sync failed on track(${this.id})`,
            error
          );
          failedClipIds.push(clipData.id);
        }
        return;
      }

      try {
        await this.addClip(clipData);
        addedClipIds.push(clipData.id);
      } catch (error) {
        console.error(
          `[Track] clip(${clipData.id}) add failed on track(${this.id})`,
          error
        );
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

  /** 렌더링 루프: 소속 클립들의 onTick 실행 */
  onTick(ctx: TickContext): void {
    if (!this.handleTrackVisible()) return;
    for (const clip of this.clips.values()) {
      const visibility = clip.prepareTick(ctx);

      if (visibility.becameVisible) {
        clip.onBecameVisible(ctx);
      }
      if (visibility.becameHidden) {
        clip.onBecameHidden(ctx);
      }

      if (visibility.isVisible) {
        clip.onTick(ctx);
      } else {
        if (visibility.isFirstTick) {
          // 첫 틱에서 렌더링되지 않는 클립은 onBecameHidden 호출
          clip.onBecameHidden(ctx);
        }
      }
    }
  }

  static findClip(tracks: ITrack[], clipId: string) {
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) return { trackId: track.id, clip };
    }
    return null;
  }

  static findTopOrderTrack(
    tracks: ITrack[],
    type: TrackType
  ): ITrack | undefined {
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

  static convertAssetTypeToTrackType(type: AssetType): TrackType {
    if (type === 'audio') return 'audio';
    return 'graphic';
  }

  static getNextTrackZIndex(tracks: ITrack[], type: TrackType): number {
    const sameTypeTracks = tracks
      .filter((t) => t.type === type)
      .sort((a, b) => a.zIndex - b.zIndex);
    if (sameTypeTracks.length === 0) {
      return type === 'graphic'
        ? DEFAULT_GRAPHIC_TRACK_Z_INDEX
        : DEFAULT_AUDIO_TRACK_Z_INDEX;
    }

    // 오디오 트랙은 zIndex가 영향이 없음으로, 가장 아래에 추가
    if (type === 'audio') {
      const bottomTrack = sameTypeTracks[0];
      return bottomTrack.zIndex - 1;
    }

    // 그래픽 트랙은 zIndex가 높을수록 위에 위치
    const topTrack = sameTypeTracks[sameTypeTracks.length - 1];
    return topTrack.zIndex + 1;
  }

  static create(type: TrackType, zIndex?: number): ITrack {
    if (type === 'graphic') {
      const track: IGraphicTrack = {
        id: uid(8),
        name: 'G-Track',
        zIndex: zIndex ?? DEFAULT_GRAPHIC_TRACK_Z_INDEX,
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
        name: 'A-Track',
        zIndex: zIndex ?? DEFAULT_AUDIO_TRACK_Z_INDEX,
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
