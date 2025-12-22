import type { IAudioClip, IVideoClip } from './clip';

export interface IBaseTrack {
  id: string;
  name: string;
  enabled: boolean;
  locked: boolean;
  zIndex: number;
}

export interface IVideoTrack extends IBaseTrack {
  type: 'video';
  clips: IVideoClip[];
  opacity: number; // 0-1
}

export interface IAudioTrack extends IBaseTrack {
  type: 'audio';
  clips: IAudioClip[];
  volume: number; // 0-3
}

export type ITrack = IVideoTrack | IAudioTrack;
