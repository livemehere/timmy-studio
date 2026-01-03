import { Application, Container, Sprite, Rectangle } from 'pixi.js';
import type { IVideoTrack } from '@renderer/lib/studio/domains/Track/types';
import type { Timer } from '@renderer/lib/studio/engine/Timer';
import type {
  TickContext,
  SeekingRenderMode,
  DocGetter,
  Dirtyable,
} from './types';
import { Track } from '@renderer/lib/studio/domains/Track/Track';

export class Renderer {
  // --------------------------------------------------------------------------
  // 상수 및 상태 속성
  // --------------------------------------------------------------------------
  static readonly LABELS = {
    SCENE_CONTAINER: 'SCENE_CONTAINER',
  };

  private _isInitialized = false;
  private _seekingRenderMode: SeekingRenderMode = 'proxy'; // 탐색 시 렌더링 모드 (proxy 우선)

  // Seek Synchronization State
  private seekSessionId = 0;
  private activeSeekWait: {
    id: number;
    targetMs: number;
    remainingDirty: number;
    started: boolean;
    resolve: () => void;
  } | null = null;

  // Pixi 어플리케이션
  private app: Application;
  private sceneContainer: Container;

  // Track 관리
  public tracks = new Map<string, Track>();

  // 렌더링 루프 상태
  private lastIsPlaying = false;
  private lastCurrentMs = 0;

  // 외부 의존성
  public timer: Timer;
  readonly getDoc: DocGetter;

  // 매니저
  // public seekSynchronizer: SeekSynchronizer; // REMOVED
  // public frameExporter: FrameExporter; // REMOVED

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

    // 매니저 초기화
    // this.frameExporter = new FrameExporter(this.app, docGetter); // REMOVED
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

    // 모든 트랙 정리
    for (const trackId of this.tracks.keys()) {
      this.removeTrack(trackId);
    }
    this.tracks.clear();

    // 씬 컨테이너 정리
    if (this.sceneContainer) {
      this.sceneContainer.destroy({ children: true });
    }

    // Pixi App 정리
    this.app.destroy(true, {
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

  get seekingRenderMode(): SeekingRenderMode {
    return this._seekingRenderMode;
  }

  set seekingRenderMode(mode: SeekingRenderMode) {
    this._seekingRenderMode = mode;
  }

  get currentSeekSessionId(): number {
    return this.seekSessionId;
  }

  // 하위 호환성을 위한 Getter들 (SceneManager로 위임되었던 것들 복구)
  get trackContainers(): Map<string, Container> {
    const map = new Map<string, Container>();
    for (const [id, track] of this.tracks) {
      map.set(id, track.container);
    }
    return map;
  }

  get clipSprites(): Map<string, Sprite> {
    const map = new Map<string, Sprite>();
    for (const track of this.tracks.values()) {
      for (const [id, clip] of track.clips) {
        map.set(id, clip.sprite);
      }
    }
    return map;
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

  async syncTracks(tracksData: IVideoTrack[]) {
    console.log(`[Renderer] 트랙 ${tracksData.length}개 동기화 시작`);
    const trackIds = new Set(tracksData.map((t) => t.id));

    // 1. 존재하지 않는 트랙 제거
    for (const trackId of this.tracks.keys()) {
      if (!trackIds.has(trackId)) {
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
    this.sceneContainer.sortChildren();

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

  private async addTrack(data: IVideoTrack) {
    const track = new Track(this, data);

    this.sceneContainer.addChild(track.container);
    this.tracks.set(data.id, track);
    console.log(`[Renderer] 트랙(${data.id}) 추가됨`);

    await track.sync(data);
  }

  private async updateTrack(data: IVideoTrack) {
    const track = this.tracks.get(data.id);
    if (!track) return;

    await track.sync(data);
  }

  private removeTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    this.sceneContainer.removeChild(track.container);
    track.destroy();
    this.tracks.delete(trackId);
    console.log(`[Renderer] 트랙(${trackId}) 제거됨`);
  }

  removeClip(clipId: string): void {
    for (const track of this.tracks.values()) {
      if (track.clips.has(clipId)) {
        // Track.ts의 clips public으로 접근하여 삭제 로직 수행
        const clip = track.clips.get(clipId);
        if (clip) {
          clip.unmount();
          clip.destroy();
          track.clips.delete(clipId);
        }
        return;
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

  /** 렌더 루프에서 호출되어 Seek 대기 상태를 해제할지 판단합니다. */
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
  public markClipDirty(state: Dirtyable, sessionId: number | null): void {
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
  public clearClipDirty(state: Dirtyable, sessionId: number | null): void {
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

  /** 현재 캔버스 화면을 HTMLCanvasElement로 추출합니다. */
  async exportCurrentFrame(): Promise<HTMLCanvasElement> {
    const canvas = this.app.renderer.extract.canvas(this.app.stage);
    return canvas as unknown as HTMLCanvasElement;
  }

  /** 현재 화면의 픽셀 데이터를 Uint8Array로 추출합니다. */
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
        `[Renderer] 바이트 길이 불일치: 결과 ${data.byteLength}, 예상 ${expectedBytes}`
      );
    }

    return { width, height, data };
  }

  getTrackContainer(trackId: string): Container | undefined {
    return this.tracks.get(trackId)?.container;
  }

  getClipSprite(clipId: string): Sprite | undefined {
    for (const track of this.tracks.values()) {
      if (track.clips.has(clipId)) {
        return track.clips.get(clipId)?.sprite;
      }
    }
    return undefined;
  }

  getContainerByLabel(label: string): Container | undefined {
    return this.sceneContainer.children.find(
      (child) => child.label === label
    ) as Container | undefined;
  }
}
