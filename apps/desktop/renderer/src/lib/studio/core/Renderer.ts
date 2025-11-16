import { Application, Container } from 'pixi.js';
import { VideoTrack } from '@renderer/lib/studio/core/tracks/VideoTrack';
import type { IVideoTrack } from '@renderer/lib/studio/types';
import type { Timer } from '@renderer/lib/studio/core/Timer';

export class Renderer {
  private app: Application;
  private sceneContainer: Container;
  private tracks: VideoTrack[] = [];

  private readonly timer: Timer;

  static readonly LABELS = {
    SCENE_CONTAINER: 'SCENE_CONTAINER',
  };

  constructor(trackData: IVideoTrack[], timer: Timer) {
    console.log('[Renderer] new Renderer()');
    this.timer = timer;
    this.app = new Application();
    this.sceneContainer = new Container();
    this.sceneContainer.label = Renderer.LABELS.SCENE_CONTAINER;
    this.app.stage.addChild(this.sceneContainer);

    this.tracks = trackData.map((data) => {
      const track = new VideoTrack(data);
      track.appendTo(this.sceneContainer);
      return track;
    });
  }

  async init(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    background: string
  ) {
    console.log('[Renderer] init()');
    await this.app.init({
      canvas,
      width,
      height,
      background,
    });
    this.startLoop();
  }

  destroy() {
    console.log('[Renderer] destroy()');
    this.app.destroy(true);
  }

  private startLoop() {
    console.log('[Renderer] startLoop()');
    this.app.ticker.add(() => {
      const currentTime = this.timer.current;
      this.tracks.forEach((track) => {
        if (track.enabled) {
          track.show();
          track.update(currentTime);
        } else {
          track.hide();
        }
      });
    });
  }
}
