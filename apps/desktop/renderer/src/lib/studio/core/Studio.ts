import isEqual from 'fast-deep-equal';
import { Application, Container } from 'pixi.js';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import type { IProject } from '../types';
import { PIXI_LABELS } from '@renderer/lib/studio/constants';
import { VideoTrack } from '@renderer/lib/studio/core/tracks/VideoTrack';
import { Timer } from '@renderer/lib/studio/core/Timer';
import { ImageAsset } from '@renderer/lib/studio/core/assets/ImageAsset';
import { VideoAsset } from '@renderer/lib/studio/core/assets/VideoAsset';

type Asset = ImageAsset | VideoAsset;

export class Studio {
  initialized = false;

  project$: BehaviorSubject<IProject>;
  timer: Timer;

  app: Application;
  videoTracks: VideoTrack[] = [];

  private sceneContainer: Container;

  // Asset management
  private static assetMap: Map<string, Asset> = new Map();
  private static idMap: Map<string, any> = new Map();

  static getById<T>(id: string): T | undefined {
    return Studio.idMap.get(id);
  }

  static removeById(id: string) {
    Studio.idMap.delete(id);
  }

  static getAsset(assetId: string): Asset | undefined {
    return Studio.assetMap.get(assetId);
  }

  static registerAsset(asset: Asset): void {
    Studio.assetMap.set(asset.id, asset);
  }

  static removeAsset(assetId: string): void {
    const asset = Studio.assetMap.get(assetId);
    if (asset) {
      asset.destroy();
      Studio.assetMap.delete(assetId);
    }
  }

  static clearAssets(): void {
    Studio.assetMap.forEach((asset) => asset.destroy());
    Studio.assetMap.clear();
  }

  constructor(props: { project: IProject }) {
    this.project$ = new BehaviorSubject<IProject>(props.project);
    this.timer = new Timer(props.project.settings.duration);
    this.app = new Application();
    this.sceneContainer = new Container();

    // Initialize assets
    this.instantiateAssets(props.project.assets);
  }

  destroy() {
    this.project$.complete();
    this.timer.destroy();
    this.destroyRenderer();
    Studio.clearAssets();
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
      this.timer.setDuration(project.settings.duration);
      this.rebuildScene(project);
    });
  }

  private instantiateAssets(assets: IProject['assets']) {
    // Clear existing assets
    Studio.clearAssets();

    // Create and register new assets
    assets.forEach((assetProps) => {
      if (assetProps.type === 'image') {
        const asset = new ImageAsset(assetProps);
        Studio.registerAsset(asset);
        asset.preload();
      } else if (assetProps.type === 'video') {
        const asset = new VideoAsset(assetProps);
        Studio.registerAsset(asset);
        asset.preload();
      }
      // TODO: Handle audio assets
    });

    console.log('[Studio] Assets instantiated:', assets.length);
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
      // Get playback context from timer
      const context = this.timer.context;

      this.videoTracks.forEach((track) => {
        if (track.enabled) {
          track.show();
          track.update(context);
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
