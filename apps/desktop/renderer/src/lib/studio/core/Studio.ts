import isEqual from 'fast-deep-equal';
import { Application, Container } from 'pixi.js';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import type { IProject } from '../types';
import { PIXI_LABELS } from '@renderer/lib/studio/constants';
import { VideoTrack } from '@renderer/lib/studio/core/tracks/VideoTrack';
import { Timer } from '@renderer/lib/studio/core/Timer';

export class Studio {
  initialized = false;

  project$: BehaviorSubject<IProject>;
  timer: Timer = new Timer();

  app: Application;
  videoTracks: VideoTrack[] = [];

  private sceneContainer: Container;

  private static idMap: Map<string, any> = new Map();

  static getById<T>(id: string): T | undefined {
    return Studio.idMap.get(id);
  }

  static removeById(id: string) {
    Studio.idMap.delete(id);
  }

  constructor(props: { project: IProject }) {
    this.project$ = new BehaviorSubject<IProject>(props.project);
    this.app = new Application();
    this.sceneContainer = new Container();
  }

  destroy() {
    this.project$.complete();
    this.timer.destroy();
    this.destroyRenderer();
  }

  destroyRenderer() {
    if (this.app.stage !== null) {
      this.app.destroy(true);
      this.sceneContainer.destroy(true);
      console.log('[Studio] pixi destroyed');
    }
  }

  async initRenderer({ canvas }: { canvas: HTMLCanvasElement }) {
    if (this.app.stage == null) {
      console.log('[Studio] init pixi application');
      this.app = new Application();
    }

    const project = this.project$.getValue();
    await this.app.init({
      canvas,
      width: project.settings.width,
      height: project.settings.height,
      background: project.settings.backgroundColor,
    });

    if (this.sceneContainer.destroyed) {
      console.log('[Studio] recreate scene container');
      this.sceneContainer = new Container();
    }

    this.sceneContainer.label = PIXI_LABELS.SCENE_CONTAINER;
    this.app.stage.addChild(this.sceneContainer);

    this.subscribeToProject();
    this.instantiateVideoTracks();
    this.startUpdateLoop();
  }

  private subscribeToProject() {
    this.project$.pipe(distinctUntilChanged(isEqual)).subscribe((project) => {
      console.log('[Studio] project updated, rebuilding scene');
      this.rebuildScene(project);
    });
  }

  private instantiateVideoTracks() {
    this.videoTracks = this.project$.value.tracks
      .filter((t) => t.type === 'video')
      .map((props) => new VideoTrack(props));
    this.videoTracks.forEach((track) => {
      track.add(this.sceneContainer);
    });
  }

  private startUpdateLoop() {
    this.app.ticker.add(() => {
      this.videoTracks.forEach((track) => {
        if (track.enabled) {
          track.show();
          track.update(this.timer.current);
        } else {
          track.hide();
        }
      });
    });
  }

  private rebuildScene(newProject: IProject) {
    // FIXME: 인스턴스화 한 videoTracks 내부에서처리 필요
    this.sceneContainer.removeChildren();
    Studio.idMap.clear();

    // TODO: video, audio 각각 초기화
  }
}
