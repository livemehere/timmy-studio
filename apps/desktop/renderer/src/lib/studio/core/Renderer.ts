import { Application, Container, Sprite, Texture } from 'pixi.js';
import type {
  IVideoTrack,
  IVideoClip,
  ITransform,
  IVideoMediaClip,
} from '@renderer/lib/studio/types';
import type { Timer } from '@renderer/lib/studio/core/Timer';
import type { AssetManager } from '@renderer/lib/studio/core/AssetManager';

interface ClipState {
  clip: IVideoClip;
  trackId: string;
  isUsingProxy: boolean; // 현재 proxy texture 사용 중인지
  lastSeekTime: number; // 마지막 seeking 시간
  isOriginPreloading: boolean; // origin이 preload 중인지
  pendingProxySwap: boolean; // proxy 스왑 대기 중인지 (seeked 이벤트 대기)
}

export class Renderer {
  // 초기화 상태
  private _isInitialized = false;

  // Pixi.js 인스턴스
  private app: Application;
  private sceneContainer: Container;

  // 내부 관리 Map
  private trackContainers = new Map<string, Container>();
  private clipSprites = new Map<string, Sprite>();
  private clipStates = new Map<string, ClipState>(); // 클립별 런타임 상태

  // Track 데이터 캐시 (loop에서 참조)
  private tracksCache: IVideoTrack[] = [];

  // 이전 타이머 상태 (변경 감지용)
  private lastIsPlaying = false;
  private lastCurrentMs = 0;

  // 외부 의존성
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
    // loop에서 참조할 수 있도록 캐시
    this.tracksCache = tracks;

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

    // 비디오의 경우 자동 재생 비활성화 (Texture.from이 자동재생 시킬 수 있음)
    if (clip.type === 'video') {
      (element as HTMLVideoElement).pause();
      (element as HTMLVideoElement).currentTime = 0;

      const proxy = this.assetManager.getVideoProxy(clip.assetId);
      if (proxy) {
        proxy.pause();
        proxy.currentTime = 0;
      }
    }

    const sprite = new Sprite(texture);
    sprite.label = `${Renderer.LABELS.CLIP_PREFIX}${clip.id}`;

    this.applyTransform(sprite, clip.transforms);

    container.addChild(sprite);
    this.clipSprites.set(clip.id, sprite);

    // 클립 상태 초기화
    this.clipStates.set(clip.id, {
      clip,
      trackId,
      isUsingProxy: false,
      lastSeekTime: -1,
      isOriginPreloading: false,
      pendingProxySwap: false,
    });

    console.debug(`[Renderer] Clip added: ${clip.id}`);
  }

  private updateClip(clip: IVideoClip): void {
    // clipStates 업데이트
    const state = this.clipStates.get(clip.id);
    if (state) {
      state.clip = clip;
    }
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
    this.clipStates.delete(clipId);
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
      const currentTime = this.timer.currentMs;
      const isPlaying = this.timer.isPlaying;
      const wasPlaying = this.lastIsPlaying;
      const lastTime = this.lastCurrentMs;

      // 상태 변경 감지
      const playStateChanged = isPlaying !== wasPlaying;
      const isSeeking = !isPlaying && currentTime !== lastTime;

      // Track 단위 처리
      for (const track of this.tracksCache) {
        this.updateTrackVisibility(track, currentTime);
      }

      // Clip 단위 처리
      for (const [clipId, state] of this.clipStates) {
        const { clip } = state;
        const sprite = this.clipSprites.get(clipId);
        if (!sprite) continue;

        // 클립 가시성 (시간 범위 체크)
        const isClipVisible =
          currentTime >= clip.startTime && currentTime < clip.endTime;
        sprite.visible = isClipVisible;

        if (!isClipVisible) {
          // 클립이 보이지 않으면 비디오 일시정지
          if (clip.type === 'video') {
            this.pauseVideoClip(clip);
          }
          continue;
        }

        // Transform 업데이트 (애니메이션 지원을 위해 매 프레임)
        this.applyTransform(sprite, clip.transforms);

        // 비디오 클립 특별 처리
        if (clip.type === 'video') {
          this.handleVideoClip(
            clip,
            sprite,
            state,
            currentTime,
            isPlaying,
            playStateChanged,
            isSeeking
          );
        }
      }

      // 상태 저장
      this.lastIsPlaying = isPlaying;
      this.lastCurrentMs = currentTime;
    });
  }

  // ============================================================================
  // Loop Helpers
  // ============================================================================

  /**
   * Track 가시성 업데이트
   * - enabled 속성 반영
   * - 해당 track의 클립들 중 현재 시간에 보이는 클립이 있는지 확인
   */
  private updateTrackVisibility(track: IVideoTrack, currentTime: number): void {
    const container = this.trackContainers.get(track.id);
    if (!container) return;

    // Track enabled가 false면 무조건 숨김
    if (!track.enabled) {
      container.visible = false;
      return;
    }

    // Track 내 클립 중 현재 시간에 활성화된 클립이 있는지 확인
    const hasActiveClip = track.clips.some(
      (clip) => currentTime >= clip.startTime && currentTime < clip.endTime
    );

    container.visible = hasActiveClip;
    container.alpha = track.opacity;
  }

  /**
   * 비디오 클립 처리
   * - 재생/일시정지 제어
   * - Seeking 시 proxy 스왑
   * - 재생 시 origin으로 복귀
   */
  private handleVideoClip(
    clip: IVideoMediaClip,
    sprite: Sprite,
    state: ClipState,
    currentTime: number,
    isPlaying: boolean,
    playStateChanged: boolean,
    isSeeking: boolean
  ): void {
    const origin = this.assetManager.getVideoOrigin(clip.assetId);
    const proxy = this.assetManager.getVideoProxy(clip.assetId);
    if (!origin) return;

    // 클립 내 상대 시간 계산 (trimStart 고려)
    const trimStart = clip.trimStart ?? 0;
    const clipRelativeTime = (currentTime - clip.startTime + trimStart) / 1000;

    if (isPlaying) {
      // 재생 중: origin 비디오 사용

      // pending swap 취소 (재생 시작되면 proxy 스왑 불필요)
      if (state.pendingProxySwap) {
        state.pendingProxySwap = false;
      }

      if (state.isUsingProxy && proxy) {
        // proxy → origin 스왑 (origin은 이미 preload됨)
        this.swapVideoTexture(sprite, origin);
        state.isUsingProxy = false;
        state.isOriginPreloading = false;
        proxy.pause();
        console.debug(
          `[Renderer] Swap to origin: ${clip.id} (origin: ${origin.currentTime.toFixed(3)}, proxy: ${proxy.currentTime.toFixed(3)})`
        );
      }

      if (playStateChanged) {
        // 재생 시작: 재생
        origin.play().catch((e) => {
          console.warn(`[Renderer] Video play failed: ${clip.id}`, e);
        });
      }
    } else {
      // 일시정지 상태
      if (playStateChanged) {
        // 방금 일시정지됨 - origin의 실제 프레임 위치를 기준으로 동기화
        const actualOriginTime = origin.currentTime;
        origin.pause();
        if (proxy) {
          // proxy를 origin의 실제 멈춘 프레임으로 동기화 (프레임 점프 방지)
          proxy.currentTime = actualOriginTime;
          proxy.pause();
        }
        console.debug(
          `[Renderer] Paused: ${clip.id} (origin: ${actualOriginTime.toFixed(3)}, calculated: ${clipRelativeTime.toFixed(3)})`
        );
      }

      if (isSeeking) {
        // Seeking 중: proxy 사용 (있는 경우)
        if (proxy && !state.isUsingProxy && !state.pendingProxySwap) {
          // origin → proxy 스왑 요청: seeked 이벤트 후 스왑
          state.pendingProxySwap = true;
          const targetTime = origin.currentTime;
          proxy.currentTime = targetTime;

          const onSeeked = () => {
            proxy.removeEventListener('seeked', onSeeked);
            // 아직 재생 시작 안했고, 스왑 대기 중이면 스왑 실행
            if (!this.timer.isPlaying && state.pendingProxySwap) {
              this.swapVideoTexture(sprite, proxy);
              state.isUsingProxy = true;
              state.pendingProxySwap = false;
              console.debug(
                `[Renderer] Swap to proxy (seeked): ${clip.id} (time: ${proxy.currentTime.toFixed(3)})`
              );
            } else {
              state.pendingProxySwap = false;
            }
          };
          proxy.addEventListener('seeked', onSeeked, { once: true });
        }

        // 이미 proxy 사용 중이면 시간만 업데이트
        if (state.isUsingProxy && proxy) {
          proxy.currentTime = clipRelativeTime;
        }

        // origin도 백그라운드에서 동일 시간으로 preload (스왑 시 프레임 점프 방지)
        origin.currentTime = clipRelativeTime;

        state.lastSeekTime = currentTime;
      }

      if (proxy && !proxy.paused) {
        proxy.pause();
      }
    }
  }

  /**
   * 비디오 클립 일시정지
   */
  private pauseVideoClip(clip: IVideoMediaClip): void {
    const videos = this.assetManager.getVideo(clip.assetId);
    if (videos) {
      if (!videos.origin.paused) {
        videos.origin.pause();
      }
      if (videos.proxy && !videos.proxy.paused) {
        videos.proxy.pause();
      }
    }
  }

  /**
   * 스프라이트의 비디오 텍스처 교체
   */
  private swapVideoTexture(
    sprite: Sprite,
    videoElement: HTMLVideoElement
  ): void {
    const newTexture = Texture.from(videoElement);
    sprite.texture = newTexture;
    // Texture.from()이 video를 자동 재생시킬 수 있으므로 즉시 pause
    if (!this.timer.isPlaying) {
      videoElement.pause();
    }
  }
}
