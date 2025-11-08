import { Application } from 'pixi.js';
import { BehaviorSubject } from 'rxjs';
import type { IProject } from './types';

export class Studio {
  initialized = false;

  project$: BehaviorSubject<IProject>;
  app: Application;

  constructor(props: { project: IProject }) {
    this.project$ = new BehaviorSubject<IProject>(props.project);
    this.app = new Application();
  }

  destroy() {
    this.project$.complete();
    this.destroyRenderer();
  }

  initRenderer({ canvas }: { canvas: HTMLCanvasElement }) {
    const project = this.project$.getValue();
    this.app.init({
      canvas,
      width: project.settings.width,
      height: project.settings.height,
      background: project.settings.backgroundColor,
    });
  }

  destroyRenderer() {
    this.app.destroy();
  }
}
