import { initDevtools } from '@pixi/devtools';
import { Application, Container, Rectangle } from 'pixi.js';
import type { IGraphicTrack } from '@/lib/studio/domains/Track/types';
import type { Timer } from '@/lib/studio/engine/Timer';
import type {
  TickContext,
  SeekingRenderMode,
  DocGetter,
  Dirtyable,
} from './types';
import { GraphicTrack } from '@/lib/studio/domains/Track/GraphicTrack';

export class GraphicRenderer {
  private _isInitialized = false;

  /** 외부 의존성 */
  timer: Timer;
  readonly getDoc: DocGetter;

  /** PIXI */
  static readonly LABELS = {
    SCENE_CONTAINER: 'SCENE_CONTAINER',
  };
  private _app: Application;
  private _sceneContainer: Container;
  tracks = new Map<string, GraphicTrack>();

  /** seek 할 때 사용할 모드 (when editing : proxy, exporting : origin) */
  seekingRenderMode: SeekingRenderMode = 'proxy';
  /** 렌더러 전반으로 seek 완료 처리를 위한 promise 관리객체 */
  private _seekSessionId = 0;
  private _activeSeekWait: {
    id: number;
    targetMs: number;
    remainingDirty: number;
    started: boolean;
    resolve: () => void;
  } | null = null;
  /** 직전 렌더 틱 상태 */
  private _lastIsPlaying = false;
  private _lastCurrentMs = 0;

  constructor(timer: Timer, docGetter: DocGetter) {
    console.log('[Renderer] 생성됨');
    this.timer = timer;
    this.getDoc = docGetter;

    /** PIXI init */
    this._app = new Application();
    this._sceneContainer = new Container();
    this._sceneContainer.label = GraphicRenderer.LABELS.SCENE_CONTAINER;
    this._app.stage.addChild(this._sceneContainer);
  }

  /** 캔버스를 받아 Pixi Application을 초기화하고 렌더 루프를 시작합니다. */
  async init(canvas: HTMLCanvasElement): Promise<void> {
    const { settings } = this.getDoc();
    await this._app.init({
      canvas,
      width: settings.width,
      height: settings.height,
      background: settings.background,
      resolution: 1,
      autoDensity: false,
      resizeTo: undefined,
    });
    this._app.ticker.maxFPS = settings.frameRate;

    this.startLoop();
    this._isInitialized = true;
    if (import.meta.env.DEV) {
      initDevtools({ app: this._app });
    }

    console.log(
      `[Renderer] 초기화 완료 (${settings.width}x${settings.height})`
    );
  }

  /** 렌더러를 정리하고 메모리를 해제합니다. */
  destroy(): void {
    if (!this._isInitialized) return;
    if (!this._app || !this._app.stage) return;

    // 모든 트랙 정리
    for (const trackId of this.tracks.keys()) {
      this.removeTrack(trackId);
    }
    this.tracks.clear();

    // 씬 컨테이너 정리
    if (this._sceneContainer) {
      this._sceneContainer.destroy({ children: true });
    }

    // Pixi App 정리
    this._app.destroy(true, {
      children: true,
      texture: true,
      textureSource: true,
    });

    // this.frameExporter = null as any; // REMOVED
    this._isInitialized = false;
  }

  // --------------------------------------------------------------------------
  // 설정 및 Getter/Setter
  // --------------------------------------------------------------------------
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get currentSeekSessionId(): number {
    return this._seekSessionId;
  }

  resize(width: number, height: number): void {
    if (!this._isInitialized) return;
    if (
      width === this._app.renderer.width &&
      height === this._app.renderer.height
    )
      return;
    this._app.renderer.resize(width, height);
  }

  set background(color: string) {
    if (!this._isInitialized) return;
    if (this._app.renderer.background.color.value === color) return;
    this._app.renderer.background.color = color;
  }

  set frameRate(frameRate: number) {
    if (!this._isInitialized) return;
    if (this._app.ticker.maxFPS === frameRate) return;
    this._app.ticker.maxFPS = frameRate;
  }

  async syncTracks(tracksData: IGraphicTrack[]) {
    console.log(`[Renderer] 트랙 ${tracksData.length}개 동기화 시작`);

    // 1. 존재하지 않는 트랙 제거
    for (const trackId of this.tracks.keys()) {
      if (!tracksData.some((t) => t.id === trackId)) {
        this.removeTrack(trackId);
      }
    }

    // 2. 트랙 추가 또는 업데이트
    const tasks: Promise<void>[] = [];
    for (const trackData of tracksData) {
      if (this.tracks.has(trackData.id)) {
        tasks.push(this.updateTrack(trackData));
      } else {
        tasks.push(this.addTrack(trackData));
      }
    }
    await Promise.all(tasks);

    // z-index 정렬 적용 (컨테이너 레벨)
    this._sceneContainer.sortChildren();

    // 동기화 결과 반환
    const syncedClipIds: string[] = [];
    for (const track of this.tracks.values()) {
      for (const clipId of track.clips.keys()) {
        syncedClipIds.push(clipId);
      }
    }

    return {
      syncedTrackIds: Array.from(this.tracks.keys()),
      syncedClipIds: syncedClipIds,
    };
  }

  private async addTrack(data: IGraphicTrack) {
    const track = new GraphicTrack(this, data);

    this._sceneContainer.addChild(track.container);
    this.tracks.set(data.id, track);
    console.log(`[Renderer] 트랙(${data.id}) 추가됨`);

    await track.sync(data);
  }

  private async updateTrack(data: IGraphicTrack) {
    const track = this.tracks.get(data.id);
    if (!track) return;

    await track.sync(data);
  }

  private removeTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    this._sceneContainer.removeChild(track.container);
    track.destroy();
    this.tracks.delete(trackId);
    console.log(`[Renderer] 트랙(${trackId}) 제거됨`);
  }

  // --------------------------------------------------------------------------
  // 렌더링 루프 (Rendering Loop)
  // --------------------------------------------------------------------------

  private startLoop(): void {
    console.log('[Renderer] 렌더 루프 시작');
    this._app.ticker.add(() => {
      const ctx = this.captureTickContext();

      // 각 트랙의 클립들에게 틱 위임
      for (const track of this.tracks.values()) {
        track.tick(ctx);
      }

      this.maybeResolveSeekWait(ctx.isSeeking);
      this.commitFrameContext(ctx);
    });
  }

  private captureTickContext(): TickContext {
    const currentTime = this.timer.currentMs;
    const isPlaying = this.timer.isPlaying;
    const wasPlaying = this._lastIsPlaying;
    const lastTime = this._lastCurrentMs;

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
    this._lastIsPlaying = ctx.isPlaying;
    this._lastCurrentMs = ctx.currentTime;
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

    const id = ++this._seekSessionId;
    return new Promise<void>((resolve) => {
      this._activeSeekWait = {
        id,
        targetMs,
        remainingDirty: 0,
        started: false,
        resolve,
      };
    });
  }

  /** 렌더 루프에서 호출되어 Seek 대기 상태를 해제할지 판단합니다. */
  private maybeResolveSeekWait(isSeeking: boolean): void {
    const wait = this._activeSeekWait;
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
      this._activeSeekWait = null;
      wait.resolve();
    }
  }

  /** 클립의 상태가 변경되어 렌더링 업데이트가 필요함을 표시합니다. */
  public markClipDirty(state: Dirtyable, sessionId: number | null): void {
    if (!state.dirty) {
      state.dirty = true;
      state.dirtySessionId = sessionId;
      const wait = this._activeSeekWait;
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
  public clearClipDirty(state: Dirtyable, sessionId: number | null): void {
    if (!state.dirty) return;

    const wait = this._activeSeekWait;
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
      this._activeSeekWait = null;
      wait.resolve();
    }
  }

  // --------------------------------------------------------------------------
  // 내보내기 및 헬퍼 메서드 (Export & Helpers)
  // --------------------------------------------------------------------------

  /** 현재 캔버스 화면을 HTMLCanvasElement로 추출합니다. */
  async exportCurrentFrame(): Promise<HTMLCanvasElement> {
    const canvas = this._app.renderer.extract.canvas(this._app.stage);
    return canvas as unknown as HTMLCanvasElement;
  }

  /** 현재 화면의 픽셀 데이터를 Uint8Array로 추출합니다. */
  exportCurrentPixels(): { width: number; height: number; data: Uint8Array } {
    const { settings } = this.getDoc();
    const width = settings.width;
    const height = settings.height;

    const out = this._app.renderer.extract.pixels({
      target: this._app.stage,
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
        `[Renderer] 바이트 길이 불일치: 결과 ${data.byteLength}, 예상 ${expectedBytes}`
      );
    }

    return { width, height, data };
  }
}
