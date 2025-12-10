import { Application, Container, Sprite, Texture, VideoSource } from 'pixi.js';
import type {
  IVideoTrack,
  IVideoClip,
  ITransform,
  IVideoMediaClip,
  IImageClip,
} from '@renderer/lib/studio/types/types';
import type { Timer } from '@renderer/lib/studio/core/Timer';
import type {
  IAsset,
  IVideoAsset,
  IImageAsset,
} from '@renderer/lib/studio/types/asset';
import { toFilePath } from '@renderer/lib/studio/utils/toFilePath';

interface ClipState {
  clip: IVideoClip;
  trackId: string;
  element: HTMLVideoElement | HTMLImageElement; // clip별 DOM element
  proxyElement?: HTMLVideoElement; // video clip의 proxy element (optional)
  videoSource?: VideoSource; // video clip의 PixiJS VideoSource (메모리 관리용)
  proxyVideoSource?: VideoSource; // proxy video의 PixiJS VideoSource (메모리 관리용)
  isUsingProxy: boolean; // 현재 proxy texture 사용 중인지
  lastSeekTime: number; // 마지막 seeking 시간
  pendingProxySwap: boolean; // origin → proxy 스왑 대기 중 (seeked 이벤트 대기)
  pendingOriginSwap: boolean; // proxy → origin 스왑 대기 중 (seeked 이벤트 대기)
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

  // 이전 타이머 상태 (변경 감지용)
  private lastIsPlaying = false;
  private lastCurrentMs = 0;

  // 외부 의존성
  private timer: Timer;
  private getAsset: <T extends IAsset = IAsset>(
    assetId: string
  ) => T | undefined;

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

  constructor(
    timer: Timer,
    getAsset: <T extends IAsset = IAsset>(assetId: string) => T | undefined
  ) {
    console.debug('[Renderer] Constructor called');
    this.timer = timer;
    this.getAsset = getAsset;
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
  // Element Creation Helpers
  // ============================================================================

  private async createVideoElement(
    asset: IVideoAsset
  ): Promise<HTMLVideoElement> {
    const video = document.createElement('video');
    video.src = toFilePath(asset.filePath);
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.volume = 1.0;
    video.playbackRate = 1.0;

    await new Promise<void>((resolve, reject) => {
      video.oncanplay = () => resolve();
      video.onerror = () => {
        console.error(video.error?.message);
        reject(new Error(`Failed to load video: ${asset.filePath}`));
      };
    });

    return video;
  }

  private async createProxyVideoElement(
    asset: IVideoAsset
  ): Promise<HTMLVideoElement | undefined> {
    if (!asset.proxyFilePath) return undefined;

    const proxy = document.createElement('video');
    proxy.src = toFilePath(asset.proxyFilePath);
    proxy.crossOrigin = 'anonymous';
    proxy.preload = 'auto';
    proxy.volume = 1.0;
    proxy.playbackRate = 1.0;

    await new Promise<void>((resolve) => {
      proxy.oncanplay = () => resolve();
      proxy.onerror = () => {
        console.error(proxy.error?.message);
        console.warn(`[Renderer] Failed to load proxy: ${asset.proxyFilePath}`);
        resolve(); // proxy 로드 실패해도 계속 진행
      };
    });

    return proxy;
  }

  private createImageElement(asset: IImageAsset): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error(`Failed to load image: ${asset.filePath}`));
      img.src = toFilePath(asset.filePath);
    });
  }

  private cleanupVideoElement(video: HTMLVideoElement): void {
    video.pause();
    video.oncanplay = null;
    video.onerror = null;
    video.src = '';
    video.removeAttribute('src');
    video.load();
  }

  private cleanupImageElement(img: HTMLImageElement): void {
    img.onload = null;
    img.onerror = null;
    img.src = '';
    img.removeAttribute('src');
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

    // Get asset metadata from docStore
    const asset = this.getAsset(clip.assetId);
    if (!asset) {
      console.warn(`[Renderer] Asset metadata not found for clip: ${clip.id}`);
      return;
    }

    if (clip.type === 'video' && asset.type === 'video') {
      this.addVideoClip(trackId, clip, asset, container);
    } else if (clip.type === 'image' && asset.type === 'image') {
      this.addImageClip(trackId, clip, asset, container);
    }
  }

  private async addVideoClip(
    trackId: string,
    clip: IVideoMediaClip,
    asset: IVideoAsset,
    container: Container
  ): Promise<void> {
    try {
      // Create clip-specific video element
      const element = await this.createVideoElement(asset);
      element.pause();
      element.currentTime = 0;

      // Create proxy element if available
      const proxyElement = await this.createProxyVideoElement(asset);
      if (proxyElement) {
        proxyElement.pause();
        proxyElement.currentTime = 0;
      }

      // Create VideoSource with autoPlay disabled
      const videoSource = new VideoSource({
        resource: element,
        autoPlay: false,
      });
      const texture = Texture.from(videoSource);
      const sprite = new Sprite(texture);
      sprite.label = `${Renderer.LABELS.CLIP_PREFIX}${clip.id}`;

      // Create proxy VideoSource if available
      let proxyVideoSource: VideoSource | undefined;
      if (proxyElement) {
        proxyVideoSource = new VideoSource({
          resource: proxyElement,
          autoPlay: false,
        });
      }

      this.applyTransform(sprite, clip.transforms);

      container.addChild(sprite);

      this.clipSprites.set(clip.id, sprite);

      // Initialize clip state with elements and VideoSources
      this.clipStates.set(clip.id, {
        clip,
        trackId,
        element,
        proxyElement,
        videoSource,
        proxyVideoSource,
        isUsingProxy: false,
        lastSeekTime: -1,
        pendingProxySwap: false,
        pendingOriginSwap: false,
      });

      console.debug(`[Renderer] Video clip added: ${clip.id}`);
    } catch (error) {
      console.error(`[Renderer] Failed to add video clip: ${clip.id}`, error);
    }
  }

  private async addImageClip(
    trackId: string,
    clip: IImageClip,
    asset: IImageAsset,
    container: Container
  ): Promise<void> {
    try {
      // Create clip-specific image element
      const element = await this.createImageElement(asset);

      // Create sprite with image texture
      const texture = Texture.from(element);
      const sprite = new Sprite(texture);
      sprite.label = `${Renderer.LABELS.CLIP_PREFIX}${clip.id}`;

      this.applyTransform(sprite, clip.transforms);

      container.addChild(sprite);
      this.clipSprites.set(clip.id, sprite);

      // Initialize clip state with element
      this.clipStates.set(clip.id, {
        clip,
        trackId,
        element,
        isUsingProxy: false,
        lastSeekTime: -1,
        pendingProxySwap: false,
        pendingOriginSwap: false,
      });

      console.debug(`[Renderer] Image clip added: ${clip.id}`);
    } catch (error) {
      console.error(`[Renderer] Failed to add image clip: ${clip.id}`, error);
    }
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
    const state = this.clipStates.get(clipId);

    if (sprite) {
      sprite.parent?.removeChild(sprite);
      sprite.destroy({ texture: true, textureSource: true }); // Texture와 VideoSource도 함께 destroy
      this.clipSprites.delete(clipId);
    }

    // Cleanup clip-specific elements and VideoSources
    if (state) {
      const { element, proxyElement, videoSource, proxyVideoSource } = state;

      // Destroy VideoSources to prevent memory leak
      if (videoSource) {
        videoSource.destroy();
      }
      if (proxyVideoSource) {
        proxyVideoSource.destroy();
      }

      if (element instanceof HTMLVideoElement) {
        this.cleanupVideoElement(element);
        if (proxyElement) {
          this.cleanupVideoElement(proxyElement);
        }
      } else if (element instanceof HTMLImageElement) {
        this.cleanupImageElement(element);
      }

      this.clipStates.delete(clipId);
    }
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
      sprite.anchor.set(transforms.anchorX, transforms.anchorY);
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
  // Video Clip Playback Control
  // ============================================================================

  /**
   * 비디오 클립 메인 핸들러
   * 상태에 따라 적절한 핸들러로 분기
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
    // Get elements from ClipState
    const origin = state.element as HTMLVideoElement;
    const proxy = state.proxyElement ?? null;
    if (!origin) return;

    // 클립 내 상대 시간 계산 (trimStart 고려)
    const clipRelativeTime = this.calcClipRelativeTime(clip, currentTime);

    if (isPlaying) {
      this.handleVideoPlaying(
        clip,
        sprite,
        state,
        origin,
        proxy,
        playStateChanged
      );
    } else {
      this.handleVideoPaused(
        clip,
        sprite,
        state,
        origin,
        proxy,
        clipRelativeTime,
        playStateChanged,
        isSeeking
      );
    }
  }

  /**
   * 클립 내 상대 시간 계산 (초 단위)
   */
  private calcClipRelativeTime(
    clip: IVideoMediaClip,
    currentTime: number
  ): number {
    const trimStart = clip.trimStart ?? 0;
    return (currentTime - clip.startTime + trimStart) / 1000;
  }

  /**
   * 재생 중 상태 처리
   * - pending proxy swap 취소
   * - proxy → origin 스왑 요청 (seeked 대기)
   * - 재생 시작
   */
  private handleVideoPlaying(
    clip: IVideoMediaClip,
    sprite: Sprite,
    state: ClipState,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement | null,
    playStateChanged: boolean
  ): void {
    // pending proxy swap 취소 (재생 시작되면 proxy 스왑 불필요)
    this.cancelPendingSwaps(state, 'proxy');

    // proxy → origin 스왑 요청
    if (state.isUsingProxy && proxy && !state.pendingOriginSwap) {
      this.requestSwapToOrigin(clip, sprite, state, origin, proxy);
    }

    // origin 스왑 완료 후 재생 시작 (playStateChanged && !pendingOriginSwap)
    if (playStateChanged && !state.pendingOriginSwap && !state.isUsingProxy) {
      this.startVideoPlayback(clip, origin);
    }
  }

  /**
   * 일시정지 상태 처리
   * - 정지 시 시간 동기화
   * - seeking 시 proxy 스왑 및 시간 업데이트
   */
  private handleVideoPaused(
    clip: IVideoMediaClip,
    sprite: Sprite,
    state: ClipState,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement | null,
    clipRelativeTime: number,
    playStateChanged: boolean,
    isSeeking: boolean
  ): void {
    // 방금 일시정지됨
    if (playStateChanged) {
      this.syncOnPause(clip, origin, proxy);
    }

    // Seeking 처리
    if (isSeeking) {
      this.handleSeeking(clip, sprite, state, origin, proxy, clipRelativeTime);
    }

    // proxy 확실히 정지
    this.ensureProxyPaused(proxy);
  }

  // ============================================================================
  // Video State Transitions
  // ============================================================================

  /**
   * pending swap 취소
   * @param type 'proxy' | 'origin' | 'all'
   */
  private cancelPendingSwaps(
    state: ClipState,
    type: 'proxy' | 'origin' | 'all' = 'all'
  ): void {
    if (type === 'proxy' || type === 'all') {
      state.pendingProxySwap = false;
    }
    if (type === 'origin' || type === 'all') {
      state.pendingOriginSwap = false;
    }
  }

  /**
   * proxy → origin 스왑 요청
   * seeked 이벤트 후 실제 스왑 실행 (깜빡임 방지)
   */
  private requestSwapToOrigin(
    clip: IVideoMediaClip,
    sprite: Sprite,
    state: ClipState,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement
  ): void {
    state.pendingOriginSwap = true;
    origin.currentTime = proxy.currentTime;

    const onSeeked = () => {
      origin.removeEventListener('seeked', onSeeked);

      // 아직 스왑 대기 중이고, proxy 사용 중이면 스왑 실행
      if (state.pendingOriginSwap && state.isUsingProxy) {
        this.swapVideoTexture(sprite, origin, clip.id);
        state.isUsingProxy = false;
        state.pendingOriginSwap = false;
        proxy.pause();

        console.debug(
          `[Renderer] Swap to origin (seeked): ${clip.id} (time: ${origin.currentTime.toFixed(3)})`
        );

        // 스왑 완료 후 재생 시작
        if (this.timer.isPlaying) {
          this.startVideoPlayback(clip, origin);
        }
      } else {
        state.pendingOriginSwap = false;
      }
    };

    origin.addEventListener('seeked', onSeeked, { once: true });
  }

  /**
   * 비디오 재생 시작
   */
  private startVideoPlayback(
    clip: IVideoMediaClip,
    origin: HTMLVideoElement
  ): void {
    origin.play().catch((e) => {
      console.warn(`[Renderer] Video play failed: ${clip.id}`, e);
    });
  }

  /**
   * 일시정지 시 origin/proxy 시간 동기화
   * origin의 실제 프레임 위치를 기준으로 proxy 동기화
   */
  private syncOnPause(
    clip: IVideoMediaClip,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement | null
  ): void {
    const actualOriginTime = origin.currentTime;
    origin.pause();

    if (proxy) {
      proxy.currentTime = actualOriginTime;
      proxy.pause();
    }

    console.debug(
      `[Renderer] Paused: ${clip.id} (time: ${actualOriginTime.toFixed(3)})`
    );
  }

  /**
   * Seeking 처리
   * - origin → proxy 스왑 (seeked 이벤트 대기)
   * - 시간 업데이트
   */
  private handleSeeking(
    clip: IVideoMediaClip,
    sprite: Sprite,
    state: ClipState,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement | null,
    clipRelativeTime: number
  ): void {
    // proxy로 스왑 요청 (아직 스왑 안 됐고, 대기 중도 아닐 때)
    if (proxy && !state.isUsingProxy && !state.pendingProxySwap) {
      this.requestSwapToProxy(clip, sprite, state, origin, proxy);
    }

    // 시간 업데이트 (proxy만)
    this.updateSeekTime(state, proxy, clipRelativeTime);
  }

  /**
   * origin → proxy 스왑 요청
   * seeked 이벤트 후 실제 스왑 실행 (깜빡임 방지)
   */
  private requestSwapToProxy(
    clip: IVideoMediaClip,
    sprite: Sprite,
    state: ClipState,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement
  ): void {
    state.pendingProxySwap = true;
    proxy.currentTime = origin.currentTime;

    const onSeeked = () => {
      proxy.removeEventListener('seeked', onSeeked);

      // 아직 재생 시작 안했고, 스왑 대기 중이면 스왑 실행
      if (!this.timer.isPlaying && state.pendingProxySwap) {
        this.swapVideoTexture(sprite, proxy, clip.id);
        state.isUsingProxy = true;
        state.pendingProxySwap = false;

        console.debug(
          `[Renderer] Swap to proxy: ${clip.id} (time: ${proxy.currentTime.toFixed(3)})`
        );
      } else {
        state.pendingProxySwap = false;
      }
    };

    proxy.addEventListener('seeked', onSeeked, { once: true });
  }

  /**
   * Seeking 시 시간 업데이트
   * proxy만 업데이트 (origin은 재생 시작 시 seeked 기반으로 동기화)
   */
  private updateSeekTime(
    state: ClipState,
    proxy: HTMLVideoElement | null,
    clipRelativeTime: number
  ): void {
    // proxy만 시간 업데이트 (origin은 재생 시작 시 seeked 기반 스왑)
    if (state.isUsingProxy && proxy) {
      proxy.currentTime = clipRelativeTime;
    }
  }

  /**
   * proxy 확실히 정지
   */
  private ensureProxyPaused(proxy: HTMLVideoElement | null): void {
    if (proxy && !proxy.paused) {
      proxy.pause();
    }
  }

  /**
   * 비디오 클립 일시정지 (클립이 화면 밖일 때)
   */
  private pauseVideoClip(clip: IVideoMediaClip): void {
    const state = this.clipStates.get(clip.id);
    if (!state) return;

    const origin = state.element as HTMLVideoElement;
    const proxy = state.proxyElement ?? null;

    if (origin && !origin.paused) {
      origin.pause();
    }
    if (proxy && !proxy.paused) {
      proxy.pause();
    }
  }

  /**
   * 스프라이트의 비디오 텍스처 교체
   * ClipState에 저장된 VideoSource를 재사용
   */
  private swapVideoTexture(
    sprite: Sprite,
    videoElement: HTMLVideoElement,
    clipId: string
  ): void {
    const state = this.clipStates.get(clipId);
    if (!state) return;

    // Destroy previous texture (but not the source, we'll reuse it)
    const oldTexture = sprite.texture;
    if (oldTexture) {
      oldTexture.destroy(false); // false = keep the source
    }

    // Determine which VideoSource to use based on which element we're swapping to
    const isSwappingToOrigin = videoElement === state.element;
    const videoSource = isSwappingToOrigin
      ? state.videoSource
      : state.proxyVideoSource;

    if (!videoSource) {
      console.warn(`[Renderer] VideoSource not found for swap: ${clipId}`);
      return;
    }

    // Create new texture from existing VideoSource
    sprite.texture = Texture.from(videoSource);

    // Ensure video is paused if not playing
    if (!this.timer.isPlaying) {
      videoElement.pause();
    }
  }
}
