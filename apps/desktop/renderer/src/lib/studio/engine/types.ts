import type { IProject } from '../types/project';

export type DocGetter = () => IProject;

export type SeekingRenderMode = 'proxy' | 'origin';

export interface Dirtyable {
  dirty: boolean;
  dirtySessionId: number | null;
}

export interface ClipSyncResult {
  addedClipIds: string[];
  updatedClipIds: string[];
  removedClipIds: string[];
  failedClipIds: string[];
}

export interface TrackSyncResult extends ClipSyncResult {
  trackId: string;
}

export interface RendererSyncResult {
  addedTrackIds: string[];
  updatedTrackIds: string[];
  removedTrackIds: string[];
  failedTrackIds: string[];
  clipResults: TrackSyncResult[];
}

export interface TickContext {
  currentTime: number;
  isPlaying: boolean;
  wasPlaying: boolean;
  lastTime: number;
  playStateChanged: boolean;
  isSeeking: boolean;
}
