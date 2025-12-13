import { Application, Container, Sprite, Texture, VideoSource } from 'pixi.js';
import type {
  IVideoTrack,
  IVideoClip,
  ITransform,
  IVideoMediaClip,
  IImageClip,
  IProject,
} from '@renderer/lib/studio/types/types';
import type { Timer } from '@renderer/lib/studio/core/Timer';
import type {
  IVideoAsset,
  IImageAsset,
} from '@renderer/lib/studio/types/asset';
import { toFilePath } from '@renderer/lib/studio/utils/toFilePath';

export type DocGetter = () => IProject;

export type SeekingRenderMode = 'proxy' | 'origin';

interface ClipState {
  clip: IVideoClip;
  trackId: string;
  element: HTMLVideoElement | HTMLImageElement; // clip별 DOM element
  proxyElement?: HTMLVideoElement; // video clip의 proxy element (optional)
  videoSource?: VideoSource; // video clip의 PixiJS VideoSource (메모리 관리용)
  proxyVideoSource?: VideoSource; // proxy video의 PixiJS VideoSource (메모리 관리용)
  isUsingProxy: boolean; // 현재 proxy texture 사용 중인지
  lastSeekTime: number; // 마지막 seeking 시간
  lastSeekTarget: 'origin' | 'proxy' | null; // 마지막 seeking 대상
  dirty: boolean; // 비디오 시킹/디코딩 대기 상태
  dirtySessionId: number | null; // 현재 dirty가 속한 seek 세션
  pendingProxySwap: boolean; // origin → proxy 스왑 대기 중 (seeked 이벤트 대기)
  pendingOriginSwap: boolean; // proxy → origin 스왑 대기 중 (seeked 이벤트 대기)
}

export class Renderer {
  // 초기화 상태
  private _isInitialized = false;

  // Seeking 시 렌더링 소스 선택 (기본: proxy)
  private seekingRenderMode: SeekingRenderMode = 'proxy';

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
  private readonly getDoc: DocGetter;

  // seekAndWait 지원: 현재 seek 세션(타임라인 시킹)에서 dirty clip이 모두 해제될 때 resolve
  private seekSessionId = 0;
  private activeSeekWait: {
    id: number;
    targetMs: number;
    remainingDirty: number;
    started: boolean;
    resolve: () => void;
  } | null = null;

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

  constructor(timer: Timer, docGetter: DocGetter) {
    console.log('[Renderer] 생성됨');
    this.timer = timer;
    this.getDoc = docGetter;
    this.app = new Application();
    this.sceneContainer = new Container();
    this.sceneContainer.label = Renderer.LABELS.SCENE_CONTAINER;
    this.app.stage.addChild(this.sceneContainer);
  }

  async exportCurrentFrame() {
    return this.app.renderer.extract.canvas(this.app.stage);
  }

  exportCurrentPixels(): { width: number; height: number; data: Uint8Array } {
    const raw = this.app.renderer.extract.pixels(this.app.stage) as unknown;
    const maybe = raw as any;
    const data: Uint8Array =
      raw instanceof Uint8Array
        ? raw
        : ((maybe?.pixels as Uint8Array) ?? new Uint8Array());

    // Prefer explicit width/height if the extractor provides them.
    const extractedWidth =
      typeof maybe?.width === 'number' ? (maybe.width as number) : undefined;
    const extractedHeight =
      typeof maybe?.height === 'number' ? (maybe.height as number) : undefined;

    // Fallback: backing canvas pixel size (best for rawvideo).
    const rendererAny = this.app.renderer as any;
    const view: HTMLCanvasElement | undefined =
      rendererAny.canvas ?? rendererAny.view ?? (this.app as any).canvas;

    const width =
      extractedWidth ??
      (typeof view?.width === 'number'
        ? view.width
        : Math.round((this.app.renderer as any).width ?? 0));
    const height =
      extractedHeight ??
      (typeof view?.height === 'number'
        ? view.height
        : Math.round((this.app.renderer as any).height ?? 0));

    return { width, height, data };
  }

  setSeekingRenderMode(mode: SeekingRenderMode): void {
    this.seekingRenderMode = mode;
  }

  getSeekingRenderMode(): SeekingRenderMode {
    return this.seekingRenderMode;
  }

  /**
   * timer.seek(ms) 이후, 해당 시간에 필요한 비디오 시킹(seeked)이 모두 끝날 때까지 대기
   * - 여러 비디오 클립이 동시에 시킹될 수 있음
   * - 비디오가 아닌 클립은 dirty로 잡지 않음
   */
  waitForSeekSettled(targetMs: number): Promise<void> {
    const id = ++this.seekSessionId;
    return new Promise<void>((resolve) => {
      this.activeSeekWait = {
        id,
        targetMs,
        remainingDirty: 0,
        started: false,
        resolve,
      };
    });
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const { settings } = this.getDoc();
    console.log(`[Renderer] 바인딩 완료(${settings.width},${settings.height})`);
    await this.app.init({
      canvas,
      width: settings.width,
      height: settings.height,
      background: settings.background,
      resizeTo: undefined,
    });
    this.app.ticker.maxFPS = settings.frameRate;
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

  async syncTracks(newTracks: IVideoTrack[]) {
    console.group(`[Renderer] ${newTracks.length}개 트랙 동기화 시작`);
    const newTrackIds = new Set(newTracks.map((t) => t.id));

    const syncedClipIds: string[] = [];

    // 제거된 트랙 PIXI 에서 제거
    for (const trackId of this.trackContainers.keys()) {
      if (!newTrackIds.has(trackId)) {
        this.removeTrack(trackId);
      }
    }

    // 트랙 추가 또는 업데이트
    for (const track of newTracks) {
      if (this.trackContainers.has(track.id)) {
        const updatedClipIds = await this.updateTrack(track);
        syncedClipIds.push(...updatedClipIds);
      } else {
        const addedClipIds = await this.addTrack(track);
        syncedClipIds.push(...addedClipIds);
      }
    }

    this.sceneContainer.sortChildren();
    console.groupEnd();

    return {
      syncedTrackIds: Array.from(this.trackContainers.keys()),
      syncedClipIds,
    };
  }

  /**
   * @param track - 새로 추가 할 트랙
   * @returns 추가된 트랙의 동기화 완료된 클립 ID 배열
   */
  private async addTrack(track: IVideoTrack) {
    const container = new Container();
    container.label = `${Renderer.LABELS.TRACK_PREFIX}${track.id}`;
    container.visible = track.enabled;
    container.alpha = track.opacity;
    container.zIndex = track.zIndex;

    this.sceneContainer.addChild(container);
    this.trackContainers.set(track.id, container);
    console.log(`[Renderer] Track(${track.id})가 추가되었습니다`);

    return this.syncClips(track.id, track.clips);
  }

  /**
   * @param track - 업데이트 할 트랙
   * @return 변경된 트랙의 동기화 완료된 클립 ID 배열
   */
  private async updateTrack(track: IVideoTrack) {
    const container = this.trackContainers.get(track.id);
    if (!container) return [];

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

    return this.syncClips(track.id, track.clips);
  }

  private removeTrack(trackId: string): void {
    const container = this.trackContainers.get(trackId);
    if (!container) return;

    // 해당 트랙의 클립 스프라이트 정리
    for (const [clipId, sprite] of this.clipSprites) {
      if (sprite.parent === container) {
        this.removeClip(clipId);
      }
    }

    this.sceneContainer.removeChild(container);
    container.destroy({ children: true });
    this.trackContainers.delete(trackId);
    console.log(`[Renderer] Track(${trackId}) 이 제거되었습니다`);
  }

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

  private async syncClips(
    trackId: string,
    newClips: IVideoClip[]
  ): Promise<string[]> {
    const container = this.trackContainers.get(trackId);
    if (!container) return [];

    const newClipIds = new Set(newClips.map((c) => c.id));

    // 제거된 클립 정리
    for (const [clipId, sprite] of this.clipSprites) {
      if (sprite.parent === container && !newClipIds.has(clipId)) {
        this.removeClip(clipId);
      }
    }

    // 클립 추가 또는 업데이트
    const addClipPromises: Promise<void>[] = [];
    for (const clip of newClips) {
      if (clip.type !== 'video' && clip.type !== 'image') continue;
      if (this.clipSprites.has(clip.id)) {
        this.updateClip(clip);
      } else {
        addClipPromises.push(this.addClip(trackId, clip));
      }
    }
    // 모든 addClip 비동기 작업 완료 대기
    await Promise.all(addClipPromises);

    // 동기화된 클립 ID 반환
    return Array.from(this.clipSprites.keys()).filter((clipId) => {
      const sprite = this.clipSprites.get(clipId);
      return sprite && sprite.parent === container;
    });
  }

  private async addClip(trackId: string, clip: IVideoClip) {
    const container = this.trackContainers.get(trackId);
    if (!container) return;

    if (clip.type !== 'video' && clip.type !== 'image') return;

    // Get asset metadata from docStore
    const asset = this.getDoc().assets.find((a) => a.id === clip.assetId);
    if (!asset) {
      console.warn(`[Renderer] Asset metadata not found for clip: ${clip.id}`);
      return;
    }

    if (clip.type === 'video' && asset.type === 'video') {
      await this.addVideoClip(trackId, clip, asset, container);
    } else if (clip.type === 'image' && asset.type === 'image') {
      await this.addImageClip(trackId, clip, asset, container);
    }
  }

  private async addVideoClip(
    trackId: string,
    clip: IVideoMediaClip,
    asset: IVideoAsset,
    container: Container
  ) {
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
        lastSeekTarget: null,
        dirty: false,
        dirtySessionId: null,
        pendingProxySwap: false,
        pendingOriginSwap: false,
      });

      console.log(`[Renderer] VideoClip(${clip.id}) 인스턴스가 생성되었습니다`);
    } catch (error) {
      console.error(
        `[Renderer] VideoClip(${clip.id}) 인스턴스 생성 실패`,
        error
      );
    }
  }

  private async addImageClip(
    trackId: string,
    clip: IImageClip,
    asset: IImageAsset,
    container: Container
  ) {
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
        lastSeekTarget: null,
        dirty: false,
        dirtySessionId: null,
        pendingProxySwap: false,
        pendingOriginSwap: false,
      });

      console.log(`[Renderer] ImageClip(${clip.id}) 인스턴스가 생성되었습니다`);
    } catch (error) {
      console.error(
        `[Renderer] ImageClip(${clip.id}) 인스턴스 생성 실패`,
        error
      );
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
    // TODO: 나머지 재생속도,필터 등등.. 추가되면 여기서 업데이트
  }

  private removeClip(clipId: string): void {
    const sprite = this.clipSprites.get(clipId);
    const state = this.clipStates.get(clipId);

    if (sprite) {
      sprite.parent?.removeChild(sprite);
      sprite.destroy(true); // Texture와 VideoSource도 함께 destroy
      this.clipSprites.delete(clipId);
    }

    if (state) {
      const { element, proxyElement } = state;

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

    console.log(`[Renderer] Clip(${clipId})이 제거되었습니다`);
  }

  // private applyTransform(sprite: Sprite, transforms: ITransform): void {
  //   if (transforms.position) {
  //     sprite.x = transforms.position.x;
  //     sprite.y = transforms.position.y;
  //   }
  //   if (transforms.size) {
  //     sprite.width = transforms.size.width;
  //     sprite.height = transforms.size.height;
  //   }
  //   if (transforms.scaleX !== undefined) {
  //     sprite.scale.x = transforms.scaleX;
  //   }
  //   if (transforms.scaleY !== undefined) {
  //     sprite.scale.y = transforms.scaleY;
  //   }
  //   if (transforms.rotation !== undefined) {
  //     sprite.rotation = transforms.rotation;
  //   }
  //   if (transforms.opacity !== undefined) {
  //     sprite.alpha = transforms.opacity;
  //   }
  //   if (transforms.anchorX !== undefined || transforms.anchorY !== undefined) {
  //     sprite.anchor.set(transforms.anchorX, transforms.anchorY);
  //   }
  // }

  /**
   * texture 는 부모에 맞게 resizing 되지 않아서, scale 로 처리를 해야됨 (gpt 피셜로 일단 교체)
   * @param sprite
   * @param transforms
   * @private
   */
  private applyTransform(sprite: Sprite, transforms: ITransform): void {
    // 1) anchor 먼저 (기준점 고정)
    if (transforms.anchorX !== undefined || transforms.anchorY !== undefined) {
      sprite.anchor.set(
        transforms.anchorX ?? sprite.anchor.x,
        transforms.anchorY ?? sprite.anchor.y
      );
    }

    // 2) position
    if (transforms.position) {
      sprite.x = transforms.position.x;
      sprite.y = transforms.position.y;
    }

    // 3) base scale 계산 (size -> scale)
    // NOTE: 비율(aspect ratio) 고려 없이, width/height 각각에 맞게 스케일을 적용한다.
    let baseScaleX = 1;
    let baseScaleY = 1;

    if (transforms.size) {
      const tex = sprite.texture;

      // VideoTexture는 준비 전 0일 수 있으니 orig 우선
      const srcW = tex?.orig?.width || tex?.width || 0;
      const srcH = tex?.orig?.height || tex?.height || 0;

      if (srcW > 0 && srcH > 0) {
        baseScaleX = transforms.size.width / srcW;
        baseScaleY = transforms.size.height / srcH;
      }
    }

    // 4) user scale(추가 배율) 적용: multiplier로 처리
    const userScaleX = transforms.scaleX ?? 1;
    const userScaleY = transforms.scaleY ?? 1;

    sprite.scale.set(baseScaleX * userScaleX, baseScaleY * userScaleY);

    // 5) rotation / alpha
    if (transforms.rotation !== undefined) {
      sprite.rotation = transforms.rotation;
    }
    if (transforms.opacity !== undefined) {
      sprite.alpha = transforms.opacity;
    }
  }

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

    console.log('[Renderer] resize:', width, height);
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

    console.log('[Renderer] set background:', color);
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

    console.log('[Renderer] set frameRate:', frameRate);
    this.app.ticker.maxFPS = frameRate;
  }

  destroy(): void {
    if (!this._isInitialized) {
      console.warn('[Renderer] destroy() called before init()');
      return;
    }
    if (!this.app || !this.app.stage) {
      console.warn('[Renderer] destroy() called but app is already destroyed');
      return;
    }

    console.log('[Renderer] Destroy called');

    // 모든 클립 스프라이트 정리
    for (const clipId of this.clipSprites.keys()) {
      this.removeClip(clipId);
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

  private startLoop(): void {
    console.log('[Renderer] startLoop()');
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

      // seekAndWait: 시킹 시작/완료 감지
      this.maybeResolveSeekWait(isSeeking);

      // 상태 저장
      this.lastIsPlaying = isPlaying;
      this.lastCurrentMs = currentTime;
    });
  }

  private maybeResolveSeekWait(isSeeking: boolean): void {
    const wait = this.activeSeekWait;
    if (!wait) return;

    // timer.seek로 인해 시킹 상태에 진입했고, 목표 시간이 현재 타임라인과 같아지면 시작 처리
    if (isSeeking && this.timer.currentMs === wait.targetMs) {
      wait.started = true;
    }

    // 시작이 확인된 뒤, 남은 dirty가 없으면 완료
    if (wait.started && wait.remainingDirty === 0) {
      this.activeSeekWait = null;
      wait.resolve();
    }
  }

  private markClipDirty(state: ClipState, sessionId: number | null): void {
    // 이미 dirty면 카운트 중복 방지
    if (!state.dirty) {
      state.dirty = true;
      state.dirtySessionId = sessionId;

      const wait = this.activeSeekWait;
      if (wait && sessionId != null && wait.id === sessionId) {
        wait.remainingDirty += 1;
      }
      return;
    }

    // 이미 dirty지만 세션이 바뀐 경우(새로운 seek)라면 세션만 갱신
    if (state.dirtySessionId !== sessionId) {
      state.dirtySessionId = sessionId;
    }
  }

  private clearClipDirty(state: ClipState, sessionId: number | null): void {
    if (!state.dirty) return;

    // 세션이 있는 경우: 해당 세션에 속한 dirty만 카운트 감소
    const wait = this.activeSeekWait;
    if (
      wait &&
      sessionId != null &&
      wait.id === sessionId &&
      state.dirtySessionId === sessionId
    ) {
      wait.remainingDirty = Math.max(0, wait.remainingDirty - 1);
    }

    state.dirty = false;
    state.dirtySessionId = null;

    // seeked 이벤트로 dirty가 해제되는 케이스는 isSeeking 플래그와 무관하게 즉시 resolve 가능
    if (wait && wait.started && wait.remainingDirty === 0) {
      this.activeSeekWait = null;
      wait.resolve();
    }
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
    const sessionId = this.activeSeekWait?.id ?? null;
    this.markClipDirty(state, sessionId);

    origin.currentTime = proxy.currentTime;

    const onSeeked = () => {
      origin.removeEventListener('seeked', onSeeked);

      // 아직 스왑 대기 중이고, proxy 사용 중이면 스왑 실행
      if (state.pendingOriginSwap && state.isUsingProxy) {
        this.swapVideoTexture(sprite, origin, clip.id);
        state.isUsingProxy = false;
        state.pendingOriginSwap = false;
        proxy.pause();

        this.clearClipDirty(state, sessionId);

        console.log(
          `[Renderer] Swap to origin (seeked): ${clip.id} (time: ${origin.currentTime.toFixed(3)})`
        );

        // 스왑 완료 후 재생 시작
        if (this.timer.isPlaying) {
          this.startVideoPlayback(clip, origin);
        }
      } else {
        state.pendingOriginSwap = false;
        this.clearClipDirty(state, sessionId);
      }
    };

    origin.addEventListener('seeked', onSeeked, { once: true });
  }

  /**
   * (Paused Seeking) proxy → origin 스왑 요청 + 원하는 시킹 시간으로 origin을 이동
   * seeked 이벤트 후 실제 스왑 실행 (깜빡임 방지)
   */
  private requestSwapToOriginAtTime(
    clip: IVideoMediaClip,
    sprite: Sprite,
    state: ClipState,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement,
    targetTime: number
  ): void {
    state.pendingOriginSwap = true;
    const sessionId = this.activeSeekWait?.id ?? null;
    this.markClipDirty(state, sessionId);
    origin.currentTime = targetTime;

    const onSeeked = () => {
      origin.removeEventListener('seeked', onSeeked);

      if (!state.pendingOriginSwap) return;

      if (state.isUsingProxy) {
        this.swapVideoTexture(sprite, origin, clip.id);
        state.isUsingProxy = false;
      }

      state.pendingOriginSwap = false;

      proxy.pause();
      proxy.currentTime = origin.currentTime;

      console.log(
        `[Renderer] Swap to origin (seeking): ${clip.id} (time: ${origin.currentTime.toFixed(3)})`
      );

      this.clearClipDirty(state, sessionId);
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

    console.log(
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
    const mode: SeekingRenderMode =
      proxy && this.seekingRenderMode === 'proxy' ? 'proxy' : 'origin';

    if (mode === 'proxy') {
      // 현재 렌더링 중인 엘리먼트 시간 업데이트 (스왑 전에는 origin, 스왑 후에는 proxy)
      if (state.isUsingProxy && proxy) {
        this.updateVideoCurrentTimeIfNeeded(
          state,
          proxy,
          clipRelativeTime,
          'proxy'
        );
      } else {
        this.updateVideoCurrentTimeIfNeeded(
          state,
          origin,
          clipRelativeTime,
          'origin'
        );
      }

      // proxy로 스왑 요청 (아직 스왑 안 됐고, 대기 중도 아닐 때)
      if (proxy && !state.isUsingProxy && !state.pendingProxySwap) {
        this.requestSwapToProxy(clip, sprite, state, origin, proxy);
      }
      return;
    }

    // origin 모드: proxy 스왑 금지, origin만 시킹
    this.cancelPendingSwaps(state, 'proxy');

    // proxy를 사용 중이면 origin으로 되돌린 뒤(origin seeked 후) 스왑
    if (proxy && state.isUsingProxy && !state.pendingOriginSwap) {
      this.requestSwapToOriginAtTime(
        clip,
        sprite,
        state,
        origin,
        proxy,
        clipRelativeTime
      );
      return;
    }

    this.updateVideoCurrentTimeIfNeeded(
      state,
      origin,
      clipRelativeTime,
      'origin'
    );
  }

  private updateVideoCurrentTimeIfNeeded(
    state: ClipState,
    video: HTMLVideoElement,
    targetTime: number,
    target: 'origin' | 'proxy'
  ): void {
    const EPSILON = 0.001;
    if (Math.abs(video.currentTime - targetTime) < EPSILON) return;

    if (
      state.lastSeekTarget === target &&
      Math.abs(state.lastSeekTime - targetTime) < EPSILON
    ) {
      return;
    }

    state.lastSeekTime = targetTime;
    state.lastSeekTarget = target;

    const sessionId = this.activeSeekWait?.id ?? null;
    this.markClipDirty(state, sessionId);

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      this.clearClipDirty(state, sessionId);
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = targetTime;
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
    const sessionId = this.activeSeekWait?.id ?? null;
    this.markClipDirty(state, sessionId);
    proxy.currentTime = origin.currentTime;

    const onSeeked = () => {
      proxy.removeEventListener('seeked', onSeeked);

      // 아직 재생 시작 안했고, 스왑 대기 중이면 스왑 실행
      if (!this.timer.isPlaying && state.pendingProxySwap) {
        this.swapVideoTexture(sprite, proxy, clip.id);
        state.isUsingProxy = true;
        state.pendingProxySwap = false;

        this.clearClipDirty(state, sessionId);

        console.log(
          `[Renderer] Swap to proxy: ${clip.id} (time: ${proxy.currentTime.toFixed(3)})`
        );
      } else {
        state.pendingProxySwap = false;
        this.clearClipDirty(state, sessionId);
      }
    };

    proxy.addEventListener('seeked', onSeeked, { once: true });
  }

  /**
   * Seeking 시 시간 업데이트는 `handleSeeking()` 내부에서 모드에 따라 처리한다.
   */

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
