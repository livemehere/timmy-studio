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
  private _isInitialized = false;

  // Seeking rendering source selection
  private _seekingRenderMode: SeekingRenderMode = 'proxy';

  private app: Application;
  private sceneContainer: Container;

  public trackContainers = new Map<string, Container>();
  public clipSprites = new Map<string, Sprite>();
  public clipStates = new Map<string, ClipState>();

  private lastIsPlaying = false;
  private lastCurrentMs = 0;

  public timer: Timer;
  readonly getDoc: DocGetter;

  private seekSessionId = 0;
  private activeSeekWait: {
    id: number;
    targetMs: number;
    remainingDirty: number;
    started: boolean;
    resolve: () => void;
  } | null = null;

  private clipRenderers = new Map<ClipType, ClipRenderer<IGraphicClip>>();

  static readonly LABELS = {
    SCENE_CONTAINER: 'SCENE_CONTAINER',
    TRACK_PREFIX: 'Track-',
    CLIP_PREFIX: 'Clip-',
  };

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get seekingRenderMode(): SeekingRenderMode {
    return this._seekingRenderMode;
  }

  get currentSeekSessionId(): number {
    return this.seekSessionId;
  }

  constructor(timer: Timer, docGetter: DocGetter) {
    console.log('[Renderer] Created');
    this.timer = timer;
    this.getDoc = docGetter;
    this.app = new Application();
    this.sceneContainer = new Container();
    this.sceneContainer.label = Renderer.LABELS.SCENE_CONTAINER;
    this.app.stage.addChild(this.sceneContainer);

    // Initialize renderers
    this.clipRenderers.set('video', new VideoClipRenderer(this));
    this.clipRenderers.set('image', new ImageClipRenderer(this));
    this.clipRenderers.set('text', new TextClipRenderer(this));
    this.clipRenderers.set('shape', new ShapeClipRenderer(this));
  }

  private getClipRenderer<T extends IGraphicClip>(
    type: ClipType
  ): ClipRenderer<T> {
    const renderer = this.clipRenderers.get(type);
    if (!renderer) {
      throw new Error(`No ClipRenderer for type: ${type}`);
    }
    return renderer as ClipRenderer<T>;
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
        `[Renderer.exportCurrentPixels] byteLength mismatch: got ${data.byteLength}, expected ${expectedBytes}`
      );
    }

    return { width, height, data };
  }

  setSeekingRenderMode(mode: SeekingRenderMode): void {
    this._seekingRenderMode = mode;
  }

  getSeekingRenderMode(): SeekingRenderMode {
    return this._seekingRenderMode;
  }

  waitForSeekSettled(targetMs: number): Promise<void> {
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
      `[Renderer] init complete (${settings.width},${settings.height})`
    );
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

  async syncTracks(tracks: IVideoTrack[]) {
    console.log(`[Renderer] Syncing ${tracks.length} tracks`);
    const trackIds = new Set(tracks.map((t) => t.id));
    const syncedClipIds: string[] = [];

    // Remove tracks
    for (const trackId of this.trackContainers.keys()) {
      if (!trackIds.has(trackId)) {
        this.removeTrack(trackId);
      }
    }

    // Add/Update tracks
    for (const track of tracks) {
      if (this.trackContainers.has(track.id)) {
        const updatedClipIds = await this.updateTrack(track);
        syncedClipIds.push(...updatedClipIds);
      } else {
        const addedClipIds = await this.addTrack(track);
        syncedClipIds.push(...addedClipIds);
      }
    }

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
    console.log(`[Renderer] Track(${track.id}) added`);

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

    for (const [clipId, sprite] of this.clipSprites) {
      if (sprite.parent === container) {
        this.removeClip(clipId);
      }
    }

    this.sceneContainer.removeChild(container);
    container.destroy({ children: true });
    this.trackContainers.delete(trackId);
    console.log(`[Renderer] Track(${trackId}) removed`);
  }

  private async syncSingleClip(
    trackId: string,
    clip: IGraphicClip
  ): Promise<void> {
    const container = this.trackContainers.get(trackId);
    if (!container) return;

    // Use specific renderer
    const renderer = this.getClipRenderer(clip.type);

    if (this.clipSprites.has(clip.id)) {
      renderer.update(clip);
    } else {
      await renderer.add(clip, container);
    }
  }

  private async syncClips(
    trackId: string,
    clips: IGraphicClip[]
  ): Promise<string[]> {
    const container = this.trackContainers.get(trackId);
    if (!container) {
      throw new Error(`[Renderer] Track(${trackId}) not found`);
    }

    const newClipIds = new Set(clips.map((c) => c.id));

    // 1. Remove
    for (const [clipId, sprite] of this.clipSprites) {
      if (sprite.parent === container && !newClipIds.has(clipId)) {
        this.removeClip(clipId);
      }
    }

    // 2. Add / Update
    const tasks: Promise<void>[] = [];
    for (const clip of clips) {
      tasks.push(this.syncSingleClip(trackId, clip));
    }
    await Promise.all(tasks);

    // 3. Return IDs
    return Array.from(this.clipSprites.entries())
      .filter(([, sprite]) => sprite.parent === container)
      .map(([clipId]) => clipId);
  }

  removeClip(clipId: string): void {
    // We need to know the type to find the renderer, but we might only have ID
    // Check clipStates first
    const state = this.clipStates.get(clipId);
    if (state) {
      const renderer = this.getClipRenderer(state.clip.type);
      renderer.remove(clipId);
    } else {
      // If no state, try to find by checking all renderers or just cleaning up sprite if exists?
      // Fallback cleanup if sprite exists but no state (should not happen usually)
      const sprite = this.clipSprites.get(clipId);
      if (sprite) {
        sprite.parent?.removeChild(sprite);
        sprite.destroy(true);
        this.clipSprites.delete(clipId);
      }
    }
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

  destroy(): void {
    if (!this._isInitialized) return;
    if (!this.app || !this.app.stage) return;

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

  private startLoop(): void {
    console.log('[Renderer] startLoop()');
    this.app.ticker.add(() => {
      const ctx = this.captureTickContext();

      // Delegate tick to each renderer
      for (const renderer of this.clipRenderers.values()) {
        renderer.tick(ctx);
      }

      this.maybeResolveSeekWait(ctx.isSeeking);
      this.commitFrameContext(ctx);
    });
  }

  private commitFrameContext(ctx: TickContext): void {
    this.lastIsPlaying = ctx.isPlaying;
    this.lastCurrentMs = ctx.currentTime;
  }

  private maybeResolveSeekWait(isSeeking: boolean): void {
    const wait = this.activeSeekWait;
    if (!wait) return;

    if (!this.timer.isPlaying && this.timer.currentMs === wait.targetMs) {
      if (isSeeking || !wait.started) {
        wait.started = true;
      }
    }

    if (wait.started && wait.remainingDirty === 0) {
      this.activeSeekWait = null;
      wait.resolve();
    }
  }

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

    if (wait && wait.started && wait.remainingDirty === 0) {
      this.activeSeekWait = null;
      wait.resolve();
    }
  }
}
