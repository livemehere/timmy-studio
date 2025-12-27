import type {
  IAudioTrack,
  ITrack,
  IVideoTrack,
} from '@renderer/lib/studio/types/types';
import { uid } from 'uid';

interface CreateTrackOptions {
  name: string;
  zIndex: number;
}

interface CreateVideoTrackOptions extends CreateTrackOptions {
  type: 'video';
  opacity?: number;
}

interface CreateAudioTrackOptions extends CreateTrackOptions {
  type: 'audio';
  volume?: number;
}

type CreateTrackOptionsUnion =
  | CreateVideoTrackOptions
  | CreateAudioTrackOptions;

/**
 * 팩토리 함수: 타입에 따라 적절한 트랙 생성
 */
export function createTrack(options: CreateVideoTrackOptions): IVideoTrack;
export function createTrack(options: CreateAudioTrackOptions): IAudioTrack;
export function createTrack(options: CreateTrackOptionsUnion): ITrack {
  const { type, name, zIndex } = options;

  const id = `track-${uid(8)}`;
  const enabled = true;
  const locked = false;

  if (type === 'video') {
    return {
      id,
      name,
      zIndex,
      type: 'video',
      enabled,
      locked,
      clips: [],
      opacity: options.opacity ?? 1,
    };
  } else {
    return {
      id,
      name,
      zIndex,
      type: 'audio',
      enabled,
      locked,
      clips: [],
      volume: options.volume ?? 1,
    };
  }
}

export function createEmptyVideoTrack(
  name: string,
  zIndex: number
): IVideoTrack {
  return createTrack({ type: 'video', name, zIndex });
}

export function createEmptyAudioTrack(
  name: string,
  zIndex: number
): IAudioTrack {
  return createTrack({ type: 'audio', name, zIndex });
}

export function getLastestClipEndTime(track: ITrack): number {
  const clips = track.clips;
  if (clips.length === 0) {
    return 0;
  }
  return Math.max(...clips.map((clip) => clip.endTime));
}
