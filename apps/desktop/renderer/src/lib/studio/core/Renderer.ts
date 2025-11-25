import { Application, Container, Sprite, Texture } from 'pixi.js';
import type {
  IVideoTrack,
  IVideoClip,
  ITransform,
} from '@renderer/lib/studio/types';
import type { Timer } from '@renderer/lib/studio/core/Timer';
import type { AssetManager } from '@renderer/lib/studio/core/AssetManager';

export class Renderer {
  // 초기화 상태
  private _isInitialized = false;

  // Pixi.js 인스턴스
  private app: Application;
  private sceneContainer: Container;

  // 내부 관리 Map
  private trackContainers = new Map<string, Container>();
  private clipSprites = new Map<string, Sprite>();

  // 외부 의존성
  // @ts-expect-error - Reserved for future video synchronization
  private timer: Timer;
  private assetManager: AssetManager;

  static readonly LABELS = {
    SCENE_CONTAINER: 'SCENE_CONTAINER',
    TRACK_PREFIX: 'Track-',
    CLIP_PREFIX: 'Clip-',
  };

  // ============================================================================
  // Public Getters
  // ============================================================================

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  // ============================================================================
  // Constructor
  // ============================================================================

  constructor(timer: Timer, assetManager: AssetManager) {
    console.debug('[Renderer] Constructor called');
    this.timer = timer;
    this.assetManager = assetManager;
    this.app = new Application();
    this.sceneContainer = new Container();
    this.sceneContainer.label = Renderer.LABELS.SCENE_CONTAINER;
    this.app.stage.addChild(this.sceneContainer);
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async init(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    background: string,
    frameRate: number
  ): Promise<void> {
    console.debug(`[Renderer] init(${width},${height}) called`);
    await this.app.init({
      canvas,
      width,
      height,
      background,
      resizeTo: undefined,
    });
    this.app.ticker.maxFPS = frameRate;
    this.startLoop();
    this._isInitialized = true;
  }

  // ============================================================================
  // Public Accessors (by ID)
  // ============================================================================

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

  // ============================================================================
  // Track Management
  // ============================================================================

  syncTracks(tracks: IVideoTrack[]): void {
    const currentTrackIds = new Set(tracks.map((t) => t.id));

    // 제거된 트랙 정리
    for (const trackId of this.trackContainers.keys()) {
      if (!currentTrackIds.has(trackId)) {
        this.removeTrack(trackId);
      }
    }

    // 트랙 추가 또는 업데이트
    for (const track of tracks) {
      if (this.trackContainers.has(track.id)) {
        this.updateTrack(track);
      } else {
        this.addTrack(track);
      }
    }

    this.sceneContainer.sortChildren();
  }

  private addTrack(track: IVideoTrack): void {
    const container = new Container();
    container.label = `${Renderer.LABELS.TRACK_PREFIX}${track.id}`;
    container.visible = track.enabled;
    container.alpha = track.opacity;
    container.zIndex = track.zIndex;

    this.sceneContainer.addChild(container);
    this.trackContainers.set(track.id, container);

    // 클립도 함께 추가
    this.syncClips(track.id, track.clips);

    console.debug(`[Renderer] Track added: ${track.id}`);
  }

  private updateTrack(track: IVideoTrack): void {
    const container = this.trackContainers.get(track.id);
    if (!container) return;

    // 변경된 속성만 업데이트
    if (container.visible !== track.enabled) {
      container.visible = track.enabled;
    }
    if (container.alpha !== track.opacity) {
      container.alpha = track.opacity;
    }
    if (container.zIndex !== track.zIndex) {
      container.zIndex = track.zIndex;
    }

    // 클립 동기화
    this.syncClips(track.id, track.clips);
  }

  private removeTrack(trackId: string): void {
    const container = this.trackContainers.get(trackId);
    if (!container) return;

    // 해당 트랙의 클립 스프라이트 정리
    for (const [clipId, sprite] of this.clipSprites) {
      if (sprite.parent === container) {
        this.clearClipSprite(clipId);
      }
    }

    this.sceneContainer.removeChild(container);
    container.destroy({ children: true });
    this.trackContainers.delete(trackId);

    console.debug(`[Renderer] Track removed: ${trackId}`);
  }

  // ============================================================================
  // Clip Management
  // ============================================================================

  private syncClips(trackId: string, clips: IVideoClip[]): void {
    const container = this.trackContainers.get(trackId);
    if (!container) return;

    const currentClipIds = new Set(clips.map((c) => c.id));

    // 제거된 클립 정리
    for (const [clipId, sprite] of this.clipSprites) {
      if (sprite.parent === container && !currentClipIds.has(clipId)) {
        this.removeClip(clipId);
      }
    }

    // 클립 추가 또는 업데이트
    for (const clip of clips) {
      if (clip.type !== 'video' && clip.type !== 'image') continue;

      if (this.clipSprites.has(clip.id)) {
        this.updateClip(clip);
      } else {
        this.addClip(trackId, clip);
      }
    }
  }

  private addClip(trackId: string, clip: IVideoClip): void {
    const container = this.trackContainers.get(trackId);
    if (!container) return;

    if (clip.type !== 'video' && clip.type !== 'image') return;

    const element =
      clip.type === 'video'
        ? this.assetManager.getVideoOrigin(clip.assetId)
        : this.assetManager.getImage(clip.assetId);

    if (!element) {
      console.warn(`[Renderer] Asset not found for clip: ${clip.id}`);
      return;
    }

    const texture = Texture.from(element);

    // 비디오의 경우 자동 재생 비활성화 (HTMLVideoElement에서 직접 제어)
    if (clip.type === 'video') {
      (element as HTMLVideoElement).pause();
      (element as HTMLVideoElement).currentTime = 0;
    }

    const sprite = new Sprite(texture);
    sprite.label = `${Renderer.LABELS.CLIP_PREFIX}${clip.id}`;

    this.applyTransform(sprite, clip.transforms);

    container.addChild(sprite);
    this.clipSprites.set(clip.id, sprite);

    console.debug(`[Renderer] Clip added: ${clip.id}`);
  }

  private updateClip(clip: IVideoClip): void {
    const sprite = this.clipSprites.get(clip.id);
    if (!sprite) return;

    this.applyTransform(sprite, clip.transforms);
  }

  private removeClip(clipId: string): void {
    const sprite = this.clipSprites.get(clipId);
    if (!sprite) return;

    this.clearClipSprite(clipId);
    console.debug(`[Renderer] Clip removed: ${clipId}`);
  }

  private clearClipSprite(clipId: string): void {
    const sprite = this.clipSprites.get(clipId);
    if (!sprite) return;

    sprite.parent?.removeChild(sprite);
    sprite.destroy();
    this.clipSprites.delete(clipId);
  }

  // ============================================================================
  // Transform Helpers
  // ============================================================================

  private applyTransform(sprite: Sprite, transforms: ITransform): void {
    if (transforms.position) {
      sprite.x = transforms.position.x;
      sprite.y = transforms.position.y;
    }
    if (transforms.size) {
      sprite.width = transforms.size.width;
      sprite.height = transforms.size.height;
    }
    if (transforms.scaleX !== undefined) {
      sprite.scale.x = transforms.scaleX;
    }
    if (transforms.scaleY !== undefined) {
      sprite.scale.y = transforms.scaleY;
    }
    if (transforms.rotation !== undefined) {
      sprite.rotation = transforms.rotation;
    }
    if (transforms.opacity !== undefined) {
      sprite.alpha = transforms.opacity;
    }
    if (transforms.anchorX !== undefined || transforms.anchorY !== undefined) {
      sprite.anchor.set(transforms.anchorX ?? 0.5, transforms.anchorY ?? 0.5);
    }
  }

  // ============================================================================
  // Renderer Settings
  // ============================================================================

  resize(width: number, height: number): void {
    if (!this._isInitialized) {
      console.warn('[Renderer] resize() called before init()');
      return;
    }
    if (
      width === this.app.renderer.width &&
      height === this.app.renderer.height
    ) {
      return;
    }

    console.debug('[Renderer] resize:', width, height);
    this.app.renderer.resize(width, height);
  }

  set background(color: string) {
    if (!this._isInitialized) {
      console.warn('[Renderer] set background called before init()');
      return;
    }
    if (this.app.renderer.background.color.value === color) {
      return;
    }

    console.debug('[Renderer] set background:', color);
    this.app.renderer.background.color = color;
  }

  set frameRate(frameRate: number) {
    if (!this._isInitialized) {
      console.warn('[Renderer] set frameRate called before init()');
      return;
    }
    if (this.app.ticker.maxFPS === frameRate) {
      return;
    }

    console.debug('[Renderer] set frameRate:', frameRate);
    this.app.ticker.maxFPS = frameRate;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    if (!this._isInitialized) {
      console.warn('[Renderer] destroy() called before init()');
      return;
    }
    if (!this.app || !this.app.stage) {
      console.warn('[Renderer] destroy() called but app is already destroyed');
      return;
    }

    console.debug('[Renderer] Destroy called');

    // 모든 클립 스프라이트 정리
    for (const clipId of this.clipSprites.keys()) {
      this.clearClipSprite(clipId);
    }

    // 모든 트랙 컨테이너 정리
    for (const trackId of this.trackContainers.keys()) {
      this.removeTrack(trackId);
    }

    this.app.destroy(true);
    this.app = null as any;
    this.sceneContainer = null as any;
    this.timer = null as any;
    this.assetManager = null as any;
    this._isInitialized = false;
  }

  // ============================================================================
  // Internal Loop
  // ============================================================================

  private startLoop(): void {
    console.debug('[Renderer] startLoop()');
    this.app.ticker.add(() => {
      // Video time sync will be handled by Timer's play/pause/seek
      // Just let Pixi render the current state
    });
  }
}
