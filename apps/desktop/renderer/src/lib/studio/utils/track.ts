import type {
  IAudioTrack,
  IVideoTrack,
  ITrack,
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
    const videoTrack: IVideoTrack = {
      id,
      name,
      zIndex,
      type: 'video',
      enabled,
      locked,
      clips: [],
      opacity: options.opacity ?? 1,
    };
    return videoTrack;
  } else {
    const audioTrack: IAudioTrack = {
      id,
      name,
      zIndex,
      type: 'audio',
      enabled,
      locked,
      clips: [],
      volume: options.volume ?? 1,
    };
    return audioTrack;
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
