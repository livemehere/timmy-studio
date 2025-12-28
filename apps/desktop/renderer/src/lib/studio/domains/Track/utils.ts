import type {
  IAudioTrack,
  ITrack,
  IVideoTrack,
  TrackType,
} from '@renderer/lib/studio/domains/Track/types';
import type { AssetType } from '@renderer/lib/studio/domains/Asset/types';
import { uid } from 'uid';
import type { ClipType } from '@renderer/lib/studio/domains/Clip/types';

export class TrackUtils {
  /** 해당 타읩의 가장 높은 z-order 를 가진 트랙을 반환 */
  static findFirstTrack(tracks: ITrack[], type: TrackType): ITrack | undefined {
    return tracks
      .filter((t) => t.type == type)
      .sort((a, b) => b.zIndex - a.zIndex)[0];
  }

  /** AssetType 을 TrackType 으로 좁힘 */
  static AssetTypeToTrackType(type: AssetType): TrackType {
    return type === 'audio' ? 'audio' : 'video';
  }

  static ClipTypeToTrackType(type: ClipType): TrackType {
    return type === 'audio' ? 'audio' : 'video';
  }

  static createTrack(type: TrackType) {
    if (type === 'video') {
      return {
        id: uid(8),
        name: 'New Video Track',
        zIndex: 0,
        type: 'video',
        enabled: true,
        locked: false,
        clips: [],
        opacity: 1,
      } as IVideoTrack;
    } else {
      return {
        id: uid(8),
        name: 'New Audio Track',
        zIndex: 0,
        type: 'audio',
        enabled: true,
        locked: false,
        clips: [],
        volume: 1,
      } as IAudioTrack;
    }
  }

  static getLastestClipEndTime(track: ITrack): number {
    const clips = track.clips;
    if (clips.length === 0) {
      return 0;
    }
    return Math.max(...clips.map((clip) => clip.endTime));
  }
}
