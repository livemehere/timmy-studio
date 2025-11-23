import { Application, Container } from 'pixi.js';
import { VideoTrack } from '@renderer/lib/studio/core/tracks/VideoTrack';
import type { IVideoTrack } from '@renderer/lib/studio/types';
import type { Timer } from '@renderer/lib/studio/core/Timer';
import type { AssetManager } from '@renderer/lib/studio/core/AssetManager';
import { BehaviorSubject } from 'rxjs';

export class Renderer {
  readonly init$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );
  private app: Application;
  private sceneContainer: Container;
  private tracks = new Map<string, VideoTrack>();

  private timer: Timer;
  private assetManager: AssetManager;

  static readonly LABELS = {
    SCENE_CONTAINER: 'SCENE_CONTAINER',
  };

  get isInitialized() {
    return this.init$.value;
  }

  constructor(
    trackData: IVideoTrack[],
    timer: Timer,
    assetManager: AssetManager
  ) {
    console.log('[Renderer] new Renderer()');
    this.timer = timer;
    this.assetManager = assetManager;
    this.app = new Application();
    this.sceneContainer = new Container();
    this.sceneContainer.label = Renderer.LABELS.SCENE_CONTAINER;
    this.app.stage.addChild(this.sceneContainer);

    trackData.forEach((data) => {
      const track = new VideoTrack(data, this.assetManager);
      track.appendTo(this.sceneContainer);
      this.tracks.set(data.id, track);
    });
  }

  getTrack(trackId: string): VideoTrack | undefined {
    return this.tracks.get(trackId);
  }

  getTrackContainer(trackId: string): Container | undefined {
    return this.tracks.get(trackId)?.container;
  }

  addTrack(data: IVideoTrack) {
    if (this.tracks.has(data.id)) {
      console.warn(`[Renderer] Track ${data.id} already exists`);
      return;
    }
    const track = new VideoTrack(data, this.assetManager);
    track.appendTo(this.sceneContainer);
    this.tracks.set(data.id, track);
  }

  removeTrack(trackId: string) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.destroy();
      this.tracks.delete(trackId);
    }
  }

  toggleTrackVisibility(trackId: string, visible: boolean) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.enabled = visible;
    }
  }

  setTrackZIndex(trackId: string, zIndex: number) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.zIndex = zIndex;
    }
  }

  /* rect 에서 canvas 마운트 할 때 1회 호출 */
  async init(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    background: string,
    fps: number
  ) {
    console.log('[Renderer] init()');
    await this.app.init({
      canvas,
      width,
      height,
      background,
      resizeTo: undefined,
    });
    this.app.ticker.maxFPS = fps;
    this.startLoop();
    this.init$.next(true);
  }

  resize(width: number, height: number) {
    if (!this.isInitialized) {
      console.warn('[Renderer] setsize() called before init()');
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
    if (!this.isInitialized) {
      console.warn('[Renderer] setBackgroundColor() called before init()');
      return;
    }
    if (this.app.renderer.background.color.value === color) {
      return;
    }

    console.log('[Renderer] set backgroundColor:', color);
    this.app.renderer.background.color = color;
  }

  set frameRate(frameRate: number) {
    if (!this.isInitialized) {
      console.warn('[Renderer] setFrameRate() called before init()');
      return;
    }
    if (this.app.ticker.maxFPS === frameRate) {
      return;
    }
    console.log('[Renderer] set frameRate:', frameRate);
    this.app.ticker.maxFPS = frameRate;
  }

  destroy() {
    if (!this.isInitialized) {
      console.warn('[Renderer] destroy() called before init()');
      return;
    }
    /* Renderer 는 PreviewRenderer, Studio 에서 중복 호출 될 수 있음으로 */
    if (!this.app || !this.app.stage) {
      console.warn('[Renderer] destroy() called but app is already destroyed');
      return;
    }

    this.tracks.forEach((track) => track.destroy());
    this.tracks.clear();

    this.app.destroy(true);
    this.app = null as any;
    this.sceneContainer = null as any;
    this.timer = null as any;
    this.assetManager = null as any;
    console.log('[Renderer] destroy()');
  }

  private startLoop() {
    console.log('[Renderer] startLoop()');
    this.app.ticker.add(() => {
      this.tracks.forEach((track) => track.tick(this.timer));
    });
  }
}
