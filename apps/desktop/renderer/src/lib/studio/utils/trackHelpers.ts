import type { ITrack } from '../domains/Track/types';
import type { IClip } from '../domains/Clip/types';
import type { ClipboardItem } from '../stores/interactionStore';

/**
 * 주어진 clipId가 속한 트랙을 찾아 반환한다.
 */
export function findTrackByClipId(
  tracks: ITrack[],
  clipId: string
): ITrack | undefined {
  return tracks.find((track) => track.clips.some((clip) => clip.id === clipId));
}

/**
 * 특정 트랙에서 [startTime, endTime) 범위가 기존 클립과 겹치는지 확인한다.
 * @param excludeClipId 겹침 체크에서 제외할 클립 ID (자기 자신 등)
 */
export function hasOverlap(
  track: ITrack,
  startTime: number,
  endTime: number,
  excludeClipId?: string
): boolean {
  return track.clips.some((clip) => {
    if (excludeClipId && clip.id === excludeClipId) return false;
    return !(endTime <= clip.startTime || startTime >= clip.endTime);
  });
}

/**
 * 선택된 클립들의 데이터를 수집하고, 상대 시간이 포함된 ClipboardItem[] 으로 변환한다.
 * Copy / Cut 공통 로직.
 */
export function collectClipboardItems(
  tracks: ITrack[],
  selectedClipIds: string[]
): ClipboardItem[] {
  const collected: Array<{
    clip: IClip;
    trackId: string;
    startTime: number;
  }> = [];

  for (const clipId of selectedClipIds) {
    const track = findTrackByClipId(tracks, clipId);
    if (!track) continue;

    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) continue;

    collected.push({
      clip: JSON.parse(JSON.stringify(clip)),
      trackId: track.id,
      startTime: clip.startTime,
    });
  }

  if (collected.length === 0) return [];

  const minStartTime = Math.min(...collected.map((d) => d.startTime));

  return collected.map((d) => ({
    clip: d.clip,
    trackId: d.trackId,
    relativeStartTime: d.startTime - minStartTime,
  }));
}
