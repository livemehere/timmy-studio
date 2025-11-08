import isEqual from 'fast-deep-equal';
import { Application, Graphics, Container } from 'pixi.js';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import type { IProject, IVideoClip, IShapeClip } from '../types';
import { CREATE_PIXI_LABEL, PIXI_LABELS } from '@renderer/lib/studio/constants';

export class Studio {
  initialized = false;

  project$: BehaviorSubject<IProject>;
  app: Application;

  private sceneContainer: Container;
  private pixiMap: Map<string, Container> = new Map();

  constructor(props: { project: IProject }) {
    this.project$ = new BehaviorSubject<IProject>(props.project);
    this.app = new Application();
    this.sceneContainer = new Container();
  }

  destroy() {
    this.project$.complete();
    this.destroyRenderer();
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
    this.startDrawLoop();
  }

  destroyRenderer() {
    if (this.app.stage !== null) {
      this.app.destroy(true);
      this.sceneContainer.destroy(true);
      console.log('[Studio] pixi destroyed');
    }
  }

  private startDrawLoop() {}

  private subscribeToProject() {
    this.project$.pipe(distinctUntilChanged(isEqual)).subscribe((project) => {
      console.log('[Studio] project updated, rebuilding scene');
      this.rebuildScene(project);
    });
  }

  private rebuildScene(project: IProject) {
    this.sceneContainer.removeChildren();
    this.pixiMap.clear();

    project.timeline.tracks.forEach((track) => {
      const trackContainer = new Container();
      trackContainer.label = CREATE_PIXI_LABEL.track(track.id);
      this.sceneContainer.addChild(trackContainer);
      this.pixiMap.set(track.id, trackContainer);

      if (track.type === 'video') {
        // Video 트랙의 opacity 적용은 나중에 Container에 적용 가능
        track.clips.forEach((clip) => {
          this.createVideoClipObject(trackContainer, clip);
        });
      }
      // Audio 트랙은 별도 처리 (나중에 구현)
    });
  }

  private createVideoClipObject(
    trackContainer: Container,
    videoClip: IVideoClip
  ) {
    const clipContainer = new Container();
    clipContainer.label = CREATE_PIXI_LABEL.clip(videoClip.id);
    trackContainer.addChild(clipContainer);
    this.pixiMap.set(videoClip.id, clipContainer);

    switch (videoClip.type) {
      case 'shape':
        this.createShapeClipObject(clipContainer, videoClip);
        break;
      // TODO: 다른 비디오 클립 타입들에 대한 처리 추가 가능
      default:
        console.warn(`[Studio] Unsupported video clip type: ${videoClip.type}`);
    }
  }

  private createShapeClipObject(
    clipContainer: Container,
    shapeClip: IShapeClip
  ) {
    const graphics = new Graphics();
    clipContainer.addChild(graphics);

    const { shapeData } = shapeClip;
    graphics
      .rect(0, 0, shapeData.width, shapeData.height)
      .fill({ color: shapeData.color })
      .stroke({
        width: shapeData.border?.width || 0,
        color: shapeData.border?.color || 0x000000,
      });
  }
}
