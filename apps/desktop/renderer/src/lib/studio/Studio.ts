import { BehaviorSubject, Subject } from 'rxjs';
import type { IProject } from './types';

export class Studio {
  /* react state 동기화를 위해서, batch 작업 끝나고 마지막에 한번씩 emit */
  project$: BehaviorSubject<IProject>;
  initialized = false;

  constructor(props: { project: IProject }) {
    this.project$ = new BehaviorSubject<IProject>(props.project);
    this.initialized = true;
  }

  destroy() {
    this.project$.complete();
  }
}
