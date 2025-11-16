import { BehaviorSubject, distinctUntilChanged, map, skip } from 'rxjs';
import type { IProject, IStudio } from '../types';
import { Timer } from '@renderer/lib/studio/core/Timer';
import { Renderer } from '@renderer/lib/studio/core/Renderer';
import { AudioManager } from '@renderer/lib/studio/core/AudioManager';

export class Studio implements IStudio {
  private project$: BehaviorSubject<IProject>;

  readonly timer: Timer;
  readonly renderer: Renderer;
  readonly audioManager: AudioManager;

  get settings() {
    return this.project$.value.settings;
  }

  subscribeSettings(callback: (settings: IProject['settings']) => void) {
    const subscription = this.project$
      .pipe(
        map((project) => project.settings),
        distinctUntilChanged()
      )
      .subscribe((settings) => {
        callback(settings);
      });
    return () => {
      subscription.unsubscribe();
    };
  }

  get videoTrackData() {
    return this.project$.value.tracks.filter((track) => track.type === 'video');
  }

  constructor(project: IProject) {
    console.log('[Studio] new Studio()');
    this.project$ = new BehaviorSubject<IProject>(project);
    /* 생성자로 인한 방출 무시 1회 */
    this.project$.pipe(skip(1)).subscribe((newProject) => {
      // TODO: 전체 업데이트
      console.log('[Studio] project updated', newProject);
    });

    this.timer = new Timer(this.settings.duration);
    this.renderer = new Renderer(this.videoTrackData, this.timer);
    this.audioManager = new AudioManager();
  }

  updateProject(project: IProject) {
    console.log('[Studio] updateProject()');
    this.project$.next(project);
  }

  destroy() {
    console.log('[Studio] destroyed');
    this.project$.complete();
    this.timer.destroy();
    this.renderer.destroy();
    this.audioManager.destroy();
  }
}
