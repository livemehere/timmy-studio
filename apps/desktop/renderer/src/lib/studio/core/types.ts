import type { IGraphicClip } from '../domains/Clip/types';
import type { VideoSource } from 'pixi.js';
import type { IProject } from '../types/project';

export type DocGetter = () => IProject;

export type SeekingRenderMode = 'proxy' | 'origin';

export interface ClipState {
  clip: IGraphicClip;
  trackId: string;
  element: HTMLVideoElement | HTMLImageElement;
  proxyElement?: HTMLVideoElement;
  videoSource?: VideoSource;
  proxyVideoSource?: VideoSource;
  isUsingProxy: boolean;
  lastSeekTime: number;
  lastSeekTarget: 'origin' | 'proxy' | null;
  dirty: boolean;
  dirtySessionId: number | null;
  pendingProxySwap: boolean;
  pendingOriginSwap: boolean;
}

export interface TickContext {
  currentTime: number;
  isPlaying: boolean;
  wasPlaying: boolean;
  lastTime: number;
  playStateChanged: boolean;
  isSeeking: boolean;
}
