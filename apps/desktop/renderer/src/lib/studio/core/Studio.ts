import { BehaviorSubject } from 'rxjs';
import type { IProject, IStudio } from '../types';
import { Timer } from '@renderer/lib/studio/core/Timer';
import { Renderer } from '@renderer/lib/studio/core/Renderer';
import { AudioManager } from '@renderer/lib/studio/core/AudioManager';
import { AssetManager } from '@renderer/lib/studio/core/AssetManager';

const DEFAULT_PROJECT: IProject = {
  id: 'default-project',
  name: 'New Project',
  settings: {
    width: 1280,
    height: 720,
    frameRate: 30,
    sampleRate: 44100,
    duration: 60000,
    backgroundColor: '#000000',
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: 'unknown',
    description: '',
  },
  tracks: [],
  assets: [],
};

export class Studio implements IStudio {
  readonly id$ = new BehaviorSubject<IProject['id']>(DEFAULT_PROJECT.id);
  readonly name$ = new BehaviorSubject<IProject['name']>(DEFAULT_PROJECT.name);
  readonly settings$ = new BehaviorSubject<IProject['settings']>(
    DEFAULT_PROJECT.settings
  );
  readonly tracks$ = new BehaviorSubject<IProject['tracks']>(
    DEFAULT_PROJECT.tracks
  );
  readonly metadata$ = new BehaviorSubject<IProject['metadata']>(
    DEFAULT_PROJECT.metadata
  );
  readonly assets$ = new BehaviorSubject<IProject['assets']>(
    DEFAULT_PROJECT.assets
  );

  readonly timer: Timer;
  readonly renderer: Renderer;
  readonly audioManager: AudioManager;
  readonly assetManager: AssetManager;

  constructor(initial: IProject) {
    console.log('[Studio] new Studio()');

    this.id$.next(initial.id);
    this.name$.next(initial.name);
    this.settings$.next(initial.settings);
    this.tracks$.next(initial.tracks);
    this.metadata$.next(initial.metadata);
    this.assets$.next(initial.assets);

    this.assetManager = new AssetManager(initial.assets);
    this.timer = new Timer(this.settings$.value.duration);
    this.renderer = new Renderer(
      this.tracks$.value.filter((track) => track.type === 'video'),
      this.timer,
      this.assetManager
    );
    this.audioManager = new AudioManager();
  }

  updateProject(project: IProject) {
    console.log('[Studio] updateProject()');
    this.id$.next(project.id);
    this.name$.next(project.name);
    this.settings$.next(project.settings);
    this.tracks$.next(project.tracks);
    this.metadata$.next(project.metadata);
    this.assets$.next(project.assets);
  }

  destroy() {
    console.log('[Studio] destroyed');

    this.id$.complete();
    this.name$.complete();
    this.settings$.complete();
    this.tracks$.complete();
    this.metadata$.complete();
    this.assets$.complete();

    this.timer.destroy();
    this.renderer.destroy();
    this.audioManager.destroy();
  }
}
