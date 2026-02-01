import type { ITransform } from '../domains/Clip/types';
import type { ITrack, IGraphicTrack } from '../domains/Track/types';

interface HitTestResult {
  clipId: string;
  trackId: string;
}

/**
 * 캔버스 좌표가 클립 영역 내에 있는지 확인 (회전 고려)
 */
function isPointInClip(x: number, y: number, transforms: ITransform): boolean {
  const { position, size, scaleX, scaleY, rotation } = transforms;

  // 클립의 실제 크기
  const actualWidth = size.width * scaleX;
  const actualHeight = size.height * scaleY;

  // 클립 중심점
  const centerX = position.x + actualWidth / 2;
  const centerY = position.y + actualHeight / 2;

  // 회전이 있으면 점을 역회전시켜서 체크
  let localX = x;
  let localY = y;

  if (rotation !== 0) {
    // 클립 중심 기준으로 역회전
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const dx = x - centerX;
    const dy = y - centerY;
    localX = centerX + dx * cos - dy * sin;
    localY = centerY + dx * sin + dy * cos;
  }

  // AABB 체크
  const left = position.x;
  const right = position.x + actualWidth;
  const top = position.y;
  const bottom = position.y + actualHeight;

  return localX >= left && localX <= right && localY >= top && localY <= bottom;
}

/**
 * 캔버스 좌표에서 클립을 찾습니다.
 * z-index가 높은 클립이 먼저 반환됩니다.
 */
export function hitTestClips(
  canvasX: number,
  canvasY: number,
  tracks: ITrack[],
  currentTimeMs: number
): HitTestResult | null {
  // z-index 내림차순으로 정렬 (위에 있는 것부터 체크)
  const graphicTracks = tracks
    .filter((t): t is IGraphicTrack => t.type === 'graphic')
    .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));

  for (const track of graphicTracks) {
    if (!track.enabled) continue;

    // 클립도 역순으로 (나중에 추가된 것이 위에 있다고 가정)
    const clips = [...track.clips].reverse();

    for (const clip of clips) {
      if (!clip.enabled) continue;

      // 현재 시간에 보이는 클립인지 체크
      const clipStartMs = clip.startTime * 1000;
      const clipEndMs = clip.endTime * 1000;
      if (currentTimeMs < clipStartMs || currentTimeMs >= clipEndMs) continue;

      // hitTest
      if (isPointInClip(canvasX, canvasY, clip.transforms)) {
        return {
          clipId: clip.id,
          trackId: track.id,
        };
      }
    }
  }

  return null;
}
