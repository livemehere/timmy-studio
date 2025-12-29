import { Application, Container, Rectangle, Sprite } from 'pixi.js';
import type {
  IGraphicClip,
  ClipType,
} from '@renderer/lib/studio/domains/Clip/types';
import type { Timer } from '@renderer/lib/studio/core/Timer';
import type { IVideoTrack } from '@renderer/lib/studio/domains/Track/types';
import {
  type ClipRenderer,
  VideoClipRenderer,
  ImageClipRenderer,
  TextClipRenderer,
  ShapeClipRenderer,
} from '@renderer/lib/studio/core/ClipRenderer';
import type {
  ClipState,
  TickContext,
  SeekingRenderMode,
  DocGetter,
} from './types';

export class Renderer {
  // --------------------------------------------------------------------------
  // 상수 및 상태 속성
  // --------------------------------------------------------------------------
  static readonly LABELS = {
    SCENE_CONTAINER: 'SCENE_CONTAINER',
    TRACK_PREFIX: 'Track-',
    CLIP_PREFIX: 'Clip-',
  };

  private _isInitialized = false;
  private _seekingRenderMode: SeekingRenderMode = 'proxy'; // 탐색 시 렌더링 모드 (proxy 우선)

  // Pixi 어플리케이션
  private app: Application;
  private sceneContainer: Container;

  // 관리되는 컨테이너 및 스프라이트 맵
  public trackContainers = new Map<string, Container>();
  public clipSprites = new Map<string, Sprite>();
  public clipStates = new Map<string, ClipState>(); // 클립별 렌더링 상태 (dirty 체크 등)

  // 렌더링 루프 상태
  private lastIsPlaying = false;
  private lastCurrentMs = 0;

  // 외부 의존성
  public timer: Timer;
  readonly getDoc: DocGetter;

  // 탐색(Seek) 대기 시스템
  private seekSessionId = 0;
  private activeSeekWait: {
    id: number;
    targetMs: number;
    remainingDirty: number;
    started: boolean;
    resolve: () => void;
  } | null = null;

  // 클립 타입별 렌더러
  private clipRenderers = new Map<ClipType, ClipRenderer<IGraphicClip>>();

  // --------------------------------------------------------------------------
  // 생성자 (Constructor)
  // --------------------------------------------------------------------------
  constructor(timer: Timer, docGetter: DocGetter) {
    console.log('[Renderer] 생성됨');
    this.timer = timer;
    this.getDoc = docGetter;

    // Pixi 인스턴스 생성
    this.app = new Application();
    this.sceneContainer = new Container();
    this.sceneContainer.label = Renderer.LABELS.SCENE_CONTAINER;
    this.app.stage.addChild(this.sceneContainer);

    // 각 클립 타입별 렌더러 초기화
    this.clipRenderers.set('video', new VideoClipRenderer(this));
    this.clipRenderers.set('image', new ImageClipRenderer(this));
    this.clipRenderers.set('text', new TextClipRenderer(this));
    this.clipRenderers.set('shape', new ShapeClipRenderer(this));
  }

  // --------------------------------------------------------------------------
  // 초기화 및 생명주기 (Init & Lifecycle)
  // --------------------------------------------------------------------------

  /** 캔버스를 받아 Pixi Application을 초기화하고 렌더 루프를 시작합니다. */
  async init(canvas: HTMLCanvasElement): Promise<void> {
    const { settings } = this.getDoc();
    await this.app.init({
      canvas,
      width: settings.width,
      height: settings.height,
      background: settings.background,
      resolution: 1,
      autoDensity: false,
      resizeTo: undefined,
    });
    this.app.ticker.maxFPS = settings.frameRate;

    this.startLoop();
    this._isInitialized = true;
    console.log(
      `[Renderer] 초기화 완료 (${settings.width}x${settings.height})`
    );
  }

  /** 렌더러를 정리하고 메모리를 해제합니다. */
  destroy(): void {
    if (!this._isInitialized) return;
    if (!this.app || !this.app.stage) return;

    // 모든 클립 및 트랙 리소스 정리
    for (const clipId of this.clipSprites.keys()) {
      this.removeClip(clipId);
    }
    for (const trackId of this.trackContainers.keys()) {
      this.removeTrack(trackId);
    }

    this.app.destroy(true);
    this.app = null as any;
    this.sceneContainer = null as any;
    this.timer = null as any;
    this._isInitialized = false;
  }

  // --------------------------------------------------------------------------
  // 설정 및 Getter/Setter
  // --------------------------------------------------------------------------
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get seekingRenderMode(): SeekingRenderMode {
    return this._seekingRenderMode;
  }

  setSeekingRenderMode(mode: SeekingRenderMode): void {
    this._seekingRenderMode = mode;
  }

  get currentSeekSessionId(): number {
    return this.seekSessionId;
  }

  resize(width: number, height: number): void {
    if (!this._isInitialized) return;
    if (
      width === this.app.renderer.width &&
      height === this.app.renderer.height
    )
      return;
    this.app.renderer.resize(width, height);
  }

  set background(color: string) {
    if (!this._isInitialized) return;
    if (this.app.renderer.background.color.value === color) return;
    this.app.renderer.background.color = color;
  }

  set frameRate(frameRate: number) {
    if (!this._isInitialized) return;
    if (this.app.ticker.maxFPS === frameRate) return;
    this.app.ticker.maxFPS = frameRate;
  }

  // --------------------------------------------------------------------------
  // 트랙 및 클립 동기화 (Sync Logic)
  // --------------------------------------------------------------------------

  /**
   * 외부(스토어)로부터 최신 트랙 목록을 받아 렌더러 상태를 동기화합니다.
   * 트랙의 추가/삭제/업데이트 및 내부 클립들의 동기화를 수행합니다.
   */
  async syncTracks(tracks: IVideoTrack[]) {
    console.log(`[Renderer] 트랙 ${tracks.length}개 동기화 시작`);
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
    container.label = `${Renderer.LABELS.TRACK_PREFIX}${track.id}`;
    container.visible = track.enabled;
    container.alpha = track.opacity;
    container.zIndex = track.zIndex;

    this.sceneContainer.addChild(container);
    this.trackContainers.set(track.id, container);
    console.log(`[Renderer] 트랙(${track.id}) 추가됨`);

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
    console.log(`[Renderer] 트랙(${trackId}) 제거됨`);
  }

  /** 특정 트랙 내의 클립들을 동기화합니다. */
  private async syncClips(
    trackId: string,
    clips: IGraphicClip[]
  ): Promise<string[]> {
    const container = this.trackContainers.get(trackId);
    if (!container) {
      throw new Error(`[Renderer] 트랙(${trackId})을 찾을 수 없습니다.`);
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

  // --------------------------------------------------------------------------
  // 렌더링 루프 (Rendering Loop)
  // --------------------------------------------------------------------------

  private startLoop(): void {
    console.log('[Renderer] 렌더 루프 시작');
    this.app.ticker.add(() => {
      const ctx = this.captureTickContext();

      // 각 클립 렌더러에게 틱 위임
      for (const renderer of this.clipRenderers.values()) {
        renderer.tick(ctx);
      }

      this.maybeResolveSeekWait(ctx.isSeeking);
      this.commitFrameContext(ctx);
    });
  }

  private captureTickContext(): TickContext {
    const currentTime = this.timer.currentMs;
    const isPlaying = this.timer.isPlaying;
    const wasPlaying = this.lastIsPlaying;
    const lastTime = this.lastCurrentMs;

    return {
      currentTime,
      isPlaying,
      wasPlaying,
      lastTime,
      playStateChanged: isPlaying !== wasPlaying,
      isSeeking: !isPlaying && currentTime !== lastTime,
    };
  }

  private commitFrameContext(ctx: TickContext): void {
    this.lastIsPlaying = ctx.isPlaying;
    this.lastCurrentMs = ctx.currentTime;
  }

  // --------------------------------------------------------------------------
  // 탐색 대기 및 Dirty 관리 (Seek & Dirty Management)
  // --------------------------------------------------------------------------

  /**
   * 특정 시점으로의 탐색(Seek)이 렌더링적으로 완료될 때까지 대기합니다.
   * 비디오 로딩이나 텍스처 업로드 등 비동기 작업이 완료되기를 기다립니다.
   */
  waitForSeekSettled(targetMs: number): Promise<void> {
    // 재생 중이 아니며 이미 해당 시간에 있다면 즉시 완료
    if (!this.timer.isPlaying && this.timer.currentMs === targetMs) {
      return Promise.resolve();
    }

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

  private maybeResolveSeekWait(isSeeking: boolean): void {
    const wait = this.activeSeekWait;
    if (!wait) return;

    // 목표 시간에 도달했는지 확인
    if (!this.timer.isPlaying && this.timer.currentMs === wait.targetMs) {
      // Seek 중이거나 아직 시작 처리가 안 되었다면 시작 플래그 설정
      if (isSeeking || !wait.started) {
        wait.started = true;
      }
    }

    // 대기 중인 비동기 작업(remainingDirty)이 없으면 완료 처리
    if (wait.started && wait.remainingDirty === 0) {
      this.activeSeekWait = null;
      wait.resolve();
    }
  }

  /** 클립의 상태가 변경되어 렌더링 업데이트가 필요함을 표시합니다. */
  public markClipDirty(state: ClipState, sessionId: number | null): void {
    if (!state.dirty) {
      state.dirty = true;
      state.dirtySessionId = sessionId;
      const wait = this.activeSeekWait;
      if (wait && sessionId != null && wait.id === sessionId) {
        wait.remainingDirty += 1;
      }
      return;
    }

    if (state.dirtySessionId !== sessionId) {
      state.dirtySessionId = sessionId;
    }
  }

  /** 클립의 렌더링 업데이트가 완료되었음을 표시합니다. */
  public clearClipDirty(state: ClipState, sessionId: number | null): void {
    if (!state.dirty) return;

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

    // 모든 작업이 완료되었다면 대기 해제
    if (wait && wait.started && wait.remainingDirty === 0) {
      this.activeSeekWait = null;
      wait.resolve();
    }
  }

  // --------------------------------------------------------------------------
  // 내보내기 및 헬퍼 메서드 (Export & Helpers)
  // --------------------------------------------------------------------------

  async exportCurrentFrame() {
    return this.app.renderer.extract.canvas(this.app.stage);
  }

  exportCurrentPixels(): { width: number; height: number; data: Uint8Array } {
    const { settings } = this.getDoc();
    const width = settings.width;
    const height = settings.height;

    const out = this.app.renderer.extract.pixels({
      target: this.app.stage,
      frame: new Rectangle(0, 0, width, height),
      resolution: 1,
    });

    const data = new Uint8Array(
      out.pixels.buffer,
      out.pixels.byteOffset,
      out.pixels.byteLength
    );

    const expectedBytes = width * height * 4;
    if (data.byteLength !== expectedBytes) {
      throw new Error(
        `[Renderer.exportCurrentPixels] 바이트 길이 불일치: 결과 ${data.byteLength}, 예상 ${expectedBytes}`
      );
    }

    return { width, height, data };
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

  private getClipRenderer<T extends IGraphicClip>(
    type: ClipType
  ): ClipRenderer<T> {
    const renderer = this.clipRenderers.get(type);
    if (!renderer) {
      throw new Error(`해당 타입의 ClipRenderer가 없습니다: ${type}`);
    }
    return renderer as ClipRenderer<T>;
  }
}
