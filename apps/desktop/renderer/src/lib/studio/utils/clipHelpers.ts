import type { ITrack } from '../domains/Track/types';
import type { IClip } from '../domains/Clip/types';

/**
 * Finds a clip by ID across all tracks
 */
export function findClipInTracks(
  tracks: ITrack[],
  clipId: string
): { trackId: string; clip: IClip } | null {
  for (const track of tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) return { trackId: track.id, clip };
  }
  return null;
}
