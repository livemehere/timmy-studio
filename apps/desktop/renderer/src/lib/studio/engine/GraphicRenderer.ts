import { initDevtools } from '@pixi/devtools';
import { Application, Container, Rectangle } from 'pixi.js';
import type { IGraphicTrack } from '@/lib/studio/domains/Track/types';
import type { Timer } from '@/lib/studio/engine/Timer';
import type {
  SeekingRenderMode,
  DocGetter,
  Dirtyable,
  ClipSyncResult,
  TrackSyncResult,
  RendererSyncResult,
} from './types';
import { GraphicTrack } from '@/lib/studio/domains/Track/GraphicTrack';
import { RendererBase } from './RendererBase';

export class GraphicRenderer extends RendererBase {
  private _isInitialized = false;

  /** 외부 의존성 */
  readonly getDoc: DocGetter;

  /** PIXI */
  static readonly LABELS = {
    SCENE_CONTAINER: 'SCENE_CONTAINER',
  };
  private _app!: Application;
  private _sceneContainer!: Container;
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
  constructor(timer: Timer, docGetter: DocGetter) {
    super(timer);
    this.getDoc = docGetter;
    console.log('[GraphicRenderer] 인스턴스 생성됨');
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get currentSeekSessionId(): number {
    return this._seekSessionId;
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

  resize(width: number, height: number): void {
    if (!this._isInitialized) return;
    if (
      width === this._app.renderer.width &&
      height === this._app.renderer.height
    )
      return;
    this._app.renderer.resize(width, height);
    this.applyCanvasStyle(width, height);
  }

  async init() {
    this._app = new Application();
    this._sceneContainer = new Container();
    this._sceneContainer.label = GraphicRenderer.LABELS.SCENE_CONTAINER;
    this._sceneContainer.sortableChildren = true; // 트랙 단위로 정렬 가능하도록 설정
    this._app.stage.addChild(this._sceneContainer);

    const { settings } = this.getDoc();
    await this._app.init({
      width: settings.width,
      height: settings.height,
      background: settings.background,
      resolution: 1,
      autoDensity: false,
    });
    this._app.ticker.maxFPS = settings.frameRate;

    this.applyCanvasStyle(settings.width, settings.height);

    if (import.meta.env.DEV) {
      initDevtools({ app: this._app });
    }

    this._isInitialized = true;

    console.log(
      `[GraphicRenderer] Pixi 초기화 (${settings.width}x${settings.height}) - FPS: ${settings.frameRate}`
    );

    this.startLoop();
  }

  /** DOM 에 마운트합니다. */
  mount(parent: HTMLDivElement) {
    // 부모 요소에 canvas 추가
    parent.appendChild(this._app.canvas);
  }

  /** 렌더러를 정리하고 메모리를 해제합니다. */
  destroy(): void {
    if (!this._isInitialized) return;

    // 부모 요소에서 canvas 제거
    this._app.canvas.remove();

    // 모든 트랙 정리
    for (const trackId of this.tracks.keys()) {
      this.removeTrack(trackId);
    }
    this.tracks.clear();

    // Pixi App 정리
    this._app.destroy(true, {
      children: true,
      texture: true,
      textureSource: true,
    });

    // 내부 상태 초기화
    this._activeSeekWait = null;
    this._seekSessionId = 0;
    this.resetTickState();

    this._isInitialized = false;
  }

  syncSettings(settings: {
    width: number;
    height: number;
    background: string;
    frameRate: number;
  }): void {
    this.resize(settings.width, settings.height);
    this.background = settings.background;
    this.frameRate = settings.frameRate;
  }

  private applyCanvasStyle(width: number, height: number): void {
    const canvas = this._app.canvas;
    canvas.style.display = 'block';
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';

    const aspectRatio = width / height;
    if (aspectRatio > 1) {
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
    } else {
      canvas.style.width = 'auto';
      canvas.style.height = '100%';
    }
  }

  async syncTracks(newTracks: IGraphicTrack[]): Promise<RendererSyncResult> {
    console.log(`[Renderer] 트랙 ${newTracks.length}개 동기화 시작`);

    const newTrackIds = new Set(newTracks.map((track) => track.id));

    const addedTrackIds: string[] = [];
    const updatedTrackIds: string[] = [];
    const removedTrackIds: string[] = [];
    const failedTrackIds: string[] = [];
    const clipResults: TrackSyncResult[] = [];

    // 1. 존재하지 않는 트랙 제거
    for (const trackId of this.tracks.keys()) {
      if (!newTrackIds.has(trackId)) {
        const track = this.tracks.get(trackId);
        const removedClipIds = track ? Array.from(track.clips.keys()) : [];
        removedTrackIds.push(trackId);
        clipResults.push({
          trackId,
          addedClipIds: [],
          updatedClipIds: [],
          removedClipIds,
          failedClipIds: [],
        });
        this.removeTrack(trackId);
      }
    }

    // 2. 트랙 추가 또는 업데이트
    const tasks = newTracks.map(async (trackData) => {
      const isExisting = this.tracks.has(trackData.id);
      try {
        const result = isExisting
          ? await this.updateTrack(trackData)
          : await this.addTrack(trackData);

        if (isExisting) {
          updatedTrackIds.push(trackData.id);
        } else {
          addedTrackIds.push(trackData.id);
        }

        clipResults.push({ trackId: trackData.id, ...result });
      } catch (error) {
        console.error(
          `[Renderer] 트랙(${trackData.id}) 동기화 중 오류 발생:`,
          error
        );
        failedTrackIds.push(trackData.id);
        clipResults.push({
          trackId: trackData.id,
          addedClipIds: [],
          updatedClipIds: [],
          removedClipIds: [],
          failedClipIds: trackData.clips.map((clip) => clip.id),
        });
      }
    });

    await Promise.all(tasks);

    // z-index 정렬 적용 (컨테이너 레벨)
    this._sceneContainer.sortChildren();

    // 동기화 직후 한 프레임 즉시 반영
    this.renderOnce();

    return {
      addedTrackIds,
      updatedTrackIds,
      removedTrackIds,
      failedTrackIds,
      clipResults,
    };
  }

  private async addTrack(data: IGraphicTrack): Promise<ClipSyncResult> {
    const track = new GraphicTrack(this, data);
    this._sceneContainer.addChild(track.container);
    this.tracks.set(data.id, track);
    console.log(`[GraphicRenderer] 트랙(${data.id}) 추가됨`);
    return track.sync(data);
  }

  private async updateTrack(data: IGraphicTrack): Promise<ClipSyncResult> {
    const track = this.tracks.get(data.id);
    if (!track) {
      return {
        addedClipIds: [],
        updatedClipIds: [],
        removedClipIds: [],
        failedClipIds: data.clips.map((clip) => clip.id),
      };
    }

    return track.sync(data);
  }

  private removeTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) {
      throw new Error(
        `[Renderer] removeTrack: 트랙(${trackId})을 찾을 수 없습니다.`
      );
    }

    this._sceneContainer.removeChild(track.container);
    track.destroy();
    this.tracks.delete(trackId);
    console.log(`[GraphicRenderer] 트랙(${trackId}) 제거됨`);
  }

  private startLoop(): void {
    console.log('[GraphicRenderer] 렌더 루프 시작');
    this._app.ticker.add(() => {
      const ctx = this.captureTickContext();

      // 각 트랙의 클립들에게 틱 위임
      for (const track of this.tracks.values()) {
        track.onTick(ctx);
      }

      // timer.seekAndWait(ms) -> waitForSeekSettled(ms) 호출되면, promise 가 채워지고, 매틱마다 체크
      // export 하는 과정이 아면면 그냥 넘어감.
      this.maybeResolveSeekWait(ctx.isSeeking);

      // 다음 프레임에 사용될, 현재 틱 상태 저장
      this.commitFrameContext(ctx);
    });
  }

  private renderOnce(): void {
    if (!this._isInitialized) return;

    const ctx = this.captureTickContextFromState(
      this.timer.currentMs,
      this.timer.isPlaying
    );

    for (const track of this.tracks.values()) {
      track.onTick(ctx);
    }

    this.maybeResolveSeekWait(ctx.isSeeking);
    this.commitFrameContext(ctx);
    this._app.renderer.render(this._app.stage);
  }

  /**
   * 엔진 쪽 clip 인스턴스를 ID 로 검색.
   * 실시간 미리보기(live preview) 등에서 store 를 거치지 않고 직접 접근할 때 사용.
   */
  findClipInstance(
    clipId: string
  ):
    | import('@/lib/studio/domains/Clip/GraphicClips/GraphicClip').GraphicClip
    | null {
    for (const track of this.tracks.values()) {
      const clip = track.clips.get(clipId);
      if (clip) return clip;
    }
    return null;
  }

  /**
   * 특정 시점으로의 탐색(Seek)이 렌더링적으로 완료될 때까지 대기합니다.
   * 비디오 로딩이나 텍스처 업로드 등 비동기 작업이 완료되기를 기다립니다.
   * timer의 seekAndWait(ms) 호출 시점에 함께 호출되도록 설계되었습니다
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

  /**
   * Export용 비디오 클립의 오디오 트랙 정보 수집
   * Video 소스 파일에 포함된 오디오 스트림을 ffmpeg로 추출하기 위한 메타데이터 반환
   * - track.enabled / clip.enabled 를 확인하여 비활성화된 항목 제외
   * - asset.metadata.hasAudio 가 false 인 경우 제외
   */
  getExportVideoAudioTracks(): Array<{
    src: string;
    trimStart: number; // 초
    trimEnd: number; // 초
    startMs: number; // 타임라인 상 시작 시간 (밀리초)
    volume: number;
  }> {
    const doc = this.getDoc();
    const clips: Array<{
      src: string;
      trimStart: number;
      trimEnd: number;
      startMs: number;
      volume: number;
    }> = [];

    console.log(
      `[GraphicRenderer] Collecting video audio tracks from ${doc.tracks.length} tracks`
    );

    for (const trackData of doc.tracks) {
      if (trackData.type !== 'graphic') continue;
      if (!trackData.enabled) {
        console.log(
          `[GraphicRenderer] Skipping disabled graphic track: ${trackData.id}`
        );
        continue;
      }

      for (const clipData of trackData.clips) {
        if (clipData.type !== 'video') continue;
        if (!clipData.enabled) {
          console.log(
            `[GraphicRenderer] Skipping disabled video clip: ${clipData.id}`
          );
          continue;
        }

        const asset = doc.assets.find((a) => a.id === clipData.assetId);
        if (!asset || asset.type !== 'video') {
          console.warn(
            `[GraphicRenderer] Asset not found or invalid type for clip: ${clipData.assetId}`
          );
          continue;
        }

        // hasAudio 가 명시적으로 false 이면 제외 (undefined 는 하위호환을 위해 포함)
        if (asset.metadata.hasAudio === false) {
          console.log(
            `[GraphicRenderer] Skipping video clip without audio: ${clipData.id}`
          );
          continue;
        }

        // 원본 파일 경로 사용 (프록시가 아닌 원본에서 오디오 추출)
        const src = asset.filePath;
        const trimStart = (clipData.trimStart ?? 0) / 1000; // ms -> s
        const duration =
          (clipData.endTime - clipData.startTime - (clipData.trimEnd ?? 0)) /
          1000; // ms -> s
        const trimEnd = trimStart + duration;

        const clipInfo = {
          src,
          trimStart,
          trimEnd,
          startMs: clipData.startTime,
          volume: 1, // Video 클립엔 아직 별도의 오디오 볼륨 프로퍼티가 없으므로 기본값 1
        };

        console.log(
          `[GraphicRenderer] Added video audio clip: ${clipData.id}`,
          {
            src: src.substring(0, 50) + '...',
            trimStart: trimStart.toFixed(2) + 's',
            trimEnd: trimEnd.toFixed(2) + 's',
            duration: duration.toFixed(2) + 's',
            startMs: clipData.startTime + 'ms',
          }
        );

        clips.push(clipInfo);
      }
    }

    console.log(
      `[GraphicRenderer] Total video audio clips collected: ${clips.length}`
    );
    return clips;
  }
}
