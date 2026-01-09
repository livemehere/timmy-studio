import type { IAudioClip, IGraphicClip } from '@/lib/studio/domains/Clip/types';

export type TrackType = 'graphic' | 'audio';

export interface IBaseTrack {
  id: string;
  name: string;
  enabled: boolean;
  locked: boolean;
  zIndex: number;
}

export interface IGraphicTrack extends IBaseTrack {
  type: 'graphic';
  clips: IGraphicClip[];
  opacity: number; // 0-1
}

export interface IAudioTrack extends IBaseTrack {
  type: 'audio';
  clips: IAudioClip[];
  volume: number; // 0-3
}

export type ITrack = IGraphicTrack | IAudioTrack;
