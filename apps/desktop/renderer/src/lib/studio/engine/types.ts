import type { IProject } from '../types/project';

export type DocGetter = () => IProject;

export type SeekingRenderMode = 'proxy' | 'origin';

export interface Dirtyable {
  dirty: boolean;
  dirtySessionId: number | null;
}

export interface TickContext {
  currentTime: number;
  isPlaying: boolean;
  wasPlaying: boolean;
  lastTime: number;
  playStateChanged: boolean;
  isSeeking: boolean;
}
