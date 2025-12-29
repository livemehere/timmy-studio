import { Container, Sprite } from 'pixi.js';
import type { IVideoTrack } from '@renderer/lib/studio/domains/Track/types';
import type {
  IGraphicClip,
  ClipType,
} from '@renderer/lib/studio/domains/Clip/types';
import type { ClipRenderer } from '@renderer/lib/studio/core/ClipRenderer';
import type { ClipState } from '../types';

export class SceneManager {
  static readonly LABELS = {
    SCENE_CONTAINER: 'SCENE_CONTAINER',
    TRACK_PREFIX: 'Track-',
    CLIP_PREFIX: 'Clip-',
  };

  public trackContainers = new Map<string, Container>();
  public clipSprites = new Map<string, Sprite>();

  // Renderer가 직접 관리하는 상태
  private clipStates: Map<string, ClipState>;
  private clipRenderers: Map<ClipType, ClipRenderer<IGraphicClip>>;

  constructor(
    private sceneContainer: Container,
    clipStates: Map<string, ClipState>,
    clipRenderers: Map<ClipType, ClipRenderer<IGraphicClip>>
  ) {
    this.clipStates = clipStates;
    this.clipRenderers = clipRenderers;
  }

  // --------------------------------------------------------------------------
  // 트랙 및 클립 동기화 (Sync Logic)
  // --------------------------------------------------------------------------

  /**
   * 외부(스토어)로부터 최신 트랙 목록을 받아 렌더러 상태를 동기화합니다.
   * 트랙의 추가/삭제/업데이트 및 내부 클립들의 동기화를 수행합니다.
   */
  async syncTracks(tracks: IVideoTrack[]) {
    console.log(`[SceneManager] 트랙 ${tracks.length}개 동기화 시작`);
    const trackIds = new Set(tracks.map((t) => t.id));
    const syncedClipIds: string[] = [];

    // 1. 존재하지 않는 트랙 제거
    for (const trackId of this.trackContainers.keys()) {
      if (!trackIds.has(trackId)) {
        this.removeTrack(trackId);
      }
    }

    // 2. 트랙 추가 또는 업데이트
    for (const track of tracks) {
      if (this.trackContainers.has(track.id)) {
        const updatedClipIds = await this.updateTrack(track);
        syncedClipIds.push(...updatedClipIds);
      } else {
        const addedClipIds = await this.addTrack(track);
        syncedClipIds.push(...addedClipIds);
      }
    }

    // z-index 정렬 적용
    this.sceneContainer.sortChildren();

    return {
      syncedTrackIds: Array.from(this.trackContainers.keys()),
      syncedClipIds,
    };
  }

  private async addTrack(track: IVideoTrack) {
    const container = new Container();
    container.label = `${SceneManager.LABELS.TRACK_PREFIX}${track.id}`;
    container.visible = track.enabled;
    container.alpha = track.opacity;
    container.zIndex = track.zIndex;

    this.sceneContainer.addChild(container);
    this.trackContainers.set(track.id, container);
    console.log(`[SceneManager] 트랙(${track.id}) 추가됨`);

    return this.syncClips(track.id, track.clips);
  }

  private async updateTrack(track: IVideoTrack) {
    const container = this.trackContainers.get(track.id);
    if (!container) return [];

    if (container.visible !== track.enabled) container.visible = track.enabled;
    if (container.alpha !== track.opacity) container.alpha = track.opacity;
    if (container.zIndex !== track.zIndex) container.zIndex = track.zIndex;

    return this.syncClips(track.id, track.clips);
  }

  private removeTrack(trackId: string): void {
    const container = this.trackContainers.get(trackId);
    if (!container) return;

    // 트랙에 속한 모든 클립 제거
    for (const [clipId, sprite] of this.clipSprites) {
      if (sprite.parent === container) {
        this.removeClip(clipId);
      }
    }

    this.sceneContainer.removeChild(container);
    container.destroy({ children: true });
    this.trackContainers.delete(trackId);
    console.log(`[SceneManager] 트랙(${trackId}) 제거됨`);
  }

  /** 특정 트랙 내의 클립들을 동기화합니다. */
  private async syncClips(
    trackId: string,
    clips: IGraphicClip[]
  ): Promise<string[]> {
    const container = this.trackContainers.get(trackId);
    if (!container) {
      throw new Error(`[SceneManager] 트랙(${trackId})을 찾을 수 없습니다.`);
    }

    const newClipIds = new Set(clips.map((c) => c.id));

    // 1. 제거된 클립 처리
    for (const [clipId, sprite] of this.clipSprites) {
      if (sprite.parent === container && !newClipIds.has(clipId)) {
        this.removeClip(clipId);
      }
    }

    // 2. 추가되거나 업데이트된 클립 처리
    const tasks: Promise<void>[] = [];
    for (const clip of clips) {
      tasks.push(this.syncSingleClip(trackId, clip));
    }
    await Promise.all(tasks);

    // 3. 현재 트랙에 남아있는 클립 ID 반환
    return Array.from(this.clipSprites.entries())
      .filter(([, sprite]) => sprite.parent === container)
      .map(([clipId]) => clipId);
  }

  private async syncSingleClip(
    trackId: string,
    clip: IGraphicClip
  ): Promise<void> {
    const container = this.trackContainers.get(trackId);
    if (!container) return;

    const renderer = this.getClipRenderer(clip.type);

    if (this.clipSprites.has(clip.id)) {
      renderer.update(clip);
    } else {
      await renderer.add(clip, container);
    }
  }

  removeClip(clipId: string): void {
    // 1. ClipState가 있다면 타입을 통해 적절한 Renderer로 정리
    const state = this.clipStates.get(clipId);
    if (state) {
      const renderer = this.getClipRenderer(state.clip.type);
      renderer.remove(clipId);
    } else {
      // 2. State가 없다면 Sprite만이라도 강제 정리 (안전망)
      const sprite = this.clipSprites.get(clipId);
      if (sprite) {
        sprite.parent?.removeChild(sprite);
        sprite.destroy(true);
        this.clipSprites.delete(clipId);
      }
    }
  }

  private getClipRenderer<T extends IGraphicClip>(
    type: ClipType
  ): ClipRenderer<T> {
    const renderer = this.clipRenderers.get(type);
    if (!renderer) {
      throw new Error(`해당 타입의 ClipRenderer가 없습니다: ${type}`);
    }
    return renderer as ClipRenderer<T>;
  }

  getTrackContainer(trackId: string): Container | undefined {
    return this.trackContainers.get(trackId);
  }

  getClipSprite(clipId: string): Sprite | undefined {
    return this.clipSprites.get(clipId);
  }

  getContainerByLabel(label: string): Container | undefined {
    return this.sceneContainer.children.find(
      (child) => child.label === label
    ) as Container | undefined;
  }

  destroy(): void {
    // 모든 클립 및 트랙 리소스 정리
    for (const clipId of this.clipSprites.keys()) {
      this.removeClip(clipId);
    }
    for (const trackId of this.trackContainers.keys()) {
      this.removeTrack(trackId);
    }

    // sceneContainer는 외부(Renderer)에서 생성해서 주입받았으므로
    // Renderer가 파괴될 때 알아서 자식들도 다 파괴됨.
    // 여기서는 맵만 비워주면 됨.
    this.trackContainers.clear();
    this.clipSprites.clear();
  }
}
