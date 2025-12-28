import type { TrackType } from '@renderer/lib/studio/utils/track';
import type { ITrack } from '@renderer/lib/studio/types/track';
import type { AssetType } from '@renderer/lib/studio/domains/Asset/types';

export class TrackUtils {
  static findFirstTrack(tracks: ITrack[], type: TrackType) {
    return tracks
      .filter((t) => t.type == type)
      .sort((a, b) => b.zIndex - a.zIndex)[0];
  }

  static AssetTypeToTrackType(type: AssetType): TrackType {
    return type === 'audio' ? 'audio' : 'video';
  }
}
