import { Application, Container, Sprite } from 'pixi.js';
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
import { SeekSynchronizer } from './managers/SeekSynchronizer';
import { SceneManager } from './managers/SceneManager';
import { FrameExporter } from './managers/FrameExporter';

export class Renderer {
  // --------------------------------------------------------------------------
  // 상수 및 상태 속성
  // --------------------------------------------------------------------------
  static readonly LABELS = {
    SCENE_CONTAINER: 'SCENE_CONTAINER',
  };

  private _isInitialized = false;
  private _seekingRenderMode: SeekingRenderMode = 'proxy'; // 탐색 시 렌더링 모드 (proxy 우선)

  // Pixi 어플리케이션
  private app: Application;
  private sceneContainer: Container;

  // 관리되는 컨테이너 및 스프라이트 맵 -> SceneManager가 관리
  // (Getter를 통해 접근 가능하도록 연결)

  // 클립별 렌더링 상태 (dirty 체크 등)
  public clipStates = new Map<string, ClipState>();

  // 렌더링 루프 상태
  private lastIsPlaying = false;
  private lastCurrentMs = 0;

  // 외부 의존성
  public timer: Timer;
  readonly getDoc: DocGetter;

  // 매니저
  public seekSynchronizer: SeekSynchronizer;
  public sceneManager: SceneManager;
  public frameExporter: FrameExporter;

  // 클립 타입별 렌더러
  private clipRenderers = new Map<ClipType, ClipRenderer<IGraphicClip>>();

  // --------------------------------------------------------------------------
  // 생성자 (Constructor)
  // --------------------------------------------------------------------------
  constructor(timer: Timer, docGetter: DocGetter) {
    console.log('[Renderer] 생성됨');
    this.timer = timer;
    this.getDoc = docGetter;
    this.seekSynchronizer = new SeekSynchronizer(timer);

    // Pixi 인스턴스 생성
    this.app = new Application();
    this.sceneContainer = new Container();
    this.sceneContainer.label = Renderer.LABELS.SCENE_CONTAINER;
    this.app.stage.addChild(this.sceneContainer);

    // 매니저 초기화
    this.frameExporter = new FrameExporter(this.app, docGetter);

    // 각 클립 타입별 렌더러 초기화
    this.clipRenderers.set('video', new VideoClipRenderer(this));
    this.clipRenderers.set('image', new ImageClipRenderer(this));
    this.clipRenderers.set('text', new TextClipRenderer(this));
    this.clipRenderers.set('shape', new ShapeClipRenderer(this));

    // SceneManager 초기화 (렌더러 의존성 주입)
    this.sceneManager = new SceneManager(
      this.sceneContainer,
      this.clipStates,
      this.clipRenderers
    );
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

    this.sceneManager.destroy();

    this.app.destroy(true);
    this.app = null as any;
    this.sceneContainer = null as any;
    this.timer = null as any;
    this.seekSynchronizer = null as any;
    this.sceneManager = null as any;
    this.frameExporter = null as any;
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
    return this.seekSynchronizer.currentSeekSessionId;
  }

  // 하위 호환성을 위한 Getter들 (SceneManager로 위임)
  get trackContainers(): Map<string, Container> {
    return this.sceneManager.trackContainers;
  }

  get clipSprites(): Map<string, Sprite> {
    return this.sceneManager.clipSprites;
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
  // - 위임된 메서드들
  // --------------------------------------------------------------------------

  async syncTracks(tracks: IVideoTrack[]) {
    return this.sceneManager.syncTracks(tracks);
  }

  removeClip(clipId: string): void {
    this.sceneManager.removeClip(clipId);
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

      this.seekSynchronizer.maybeResolveSeekWait(ctx.isSeeking);
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
  // - 위임된 메서드들
  // --------------------------------------------------------------------------

  waitForSeekSettled(targetMs: number): Promise<void> {
    return this.seekSynchronizer.waitForSeekSettled(targetMs);
  }

  public markClipDirty(state: ClipState, sessionId: number | null): void {
    this.seekSynchronizer.markClipDirty(state, sessionId);
  }

  public clearClipDirty(state: ClipState, sessionId: number | null): void {
    this.seekSynchronizer.clearClipDirty(state, sessionId);
  }

  // --------------------------------------------------------------------------
  // 내보내기 및 헬퍼 메서드 (Export & Helpers)
  // - 위임된 메서드들
  // --------------------------------------------------------------------------

  async exportCurrentFrame() {
    return this.frameExporter.exportCurrentFrame();
  }

  exportCurrentPixels() {
    return this.frameExporter.exportCurrentPixels();
  }

  getTrackContainer(trackId: string): Container | undefined {
    return this.sceneManager.getTrackContainer(trackId);
  }

  getClipSprite(clipId: string): Sprite | undefined {
    return this.sceneManager.getClipSprite(clipId);
  }

  getContainerByLabel(label: string): Container | undefined {
    return this.sceneManager.getContainerByLabel(label);
  }
}
