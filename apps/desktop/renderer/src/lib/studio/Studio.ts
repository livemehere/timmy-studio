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
    this.initialized = true;
    this.draw();
  }

  destroyRenderer() {
    if (this.app.stage !== null) {
      this.app.destroy();
      console.log('[Studio] pixi destroyed');
    }
  }

  draw() {
    console.log('draw frame');
  }
}
