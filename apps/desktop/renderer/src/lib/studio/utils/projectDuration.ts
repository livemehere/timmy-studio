import type { ITrack } from '@/lib/studio/domains/Track/types';
import type { IClip } from '../domains/Clip/types';

export function getMaxClipEndTimeMs(tracks: ITrack[]): number {
  let maxEndTime = 0;
  for (const track of tracks) {
    const clips = (track as any).clips as IClip[] | undefined;
    if (!clips || clips.length === 0) continue;
    for (const clip of clips) {
      if (clip.endTime > maxEndTime) {
        maxEndTime = clip.endTime;
      }
    }
  }
  return maxEndTime;
}

export function computeNextProjectDurationMs(params: {
  enabled: boolean;
  currentDurationMs: number;
  tracks: ITrack[];
}): number {
  if (!params.enabled) return params.currentDurationMs;

  const maxEndTime = getMaxClipEndTimeMs(params.tracks);
  if (maxEndTime > params.currentDurationMs) {
    return maxEndTime;
  }
  return params.currentDurationMs;
}
