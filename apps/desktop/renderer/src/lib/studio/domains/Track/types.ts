import type {
  IAudioClip,
  IGraphicClip,
} from '@renderer/lib/studio/domains/Clip/types';

export type TrackType = 'video' | 'audio';

export interface IBaseTrack {
  id: string;
  name: string;
  enabled: boolean;
  locked: boolean;
  zIndex: number;
}

export interface IVideoTrack extends IBaseTrack {
  type: 'video';
  clips: IGraphicClip[];
  opacity: number; // 0-1
}

export interface IAudioTrack extends IBaseTrack {
  type: 'audio';
  clips: IAudioClip[];
  volume: number; // 0-3
}

export type ITrack = IVideoTrack | IAudioTrack;
