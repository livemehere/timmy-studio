import { useMemo, memo } from 'react';
import type { IFilmstripData } from '../../Asset/types';
import { toFilePath } from '@/lib/studio/utils/toFilePath';

/** 타임라인 클립에 비디오 필름스트립 썸네일을 타일링하여 표시 */
export const FilmstripBackground = memo(function FilmstripBackground({
  filmstripData,
  trimStart,
  pxPerSec,
  clipWidthPx,
}: {
  filmstripData: IFilmstripData;
  /** 트림 시작 시간 (ms) */
  trimStart: number;
  /** 현재 타임라인 줌 레벨 (px/sec) */
  pxPerSec: number;
  /** 클립의 현재 렌더링 너비 (px) */
  clipWidthPx: number;
}) {
  const { dir, frameCount, intervalMs } = filmstripData;

  const tiles = useMemo(() => {
    // 하나의 프레임이 타임라인에서 차지하는 픽셀 너비
    const frameWidthPx = (intervalMs / 1000) * pxPerSec;

    // 너무 작으면 렌더링 스킵 (성능 보호)
    if (frameWidthPx < 2 || clipWidthPx <= 0) return null;

    // trimStart 기준 첫 프레임 인덱스 & 좌측 오프셋
    const firstFrameIdx = Math.floor(trimStart / intervalMs);
    const offsetPx = ((trimStart % intervalMs) / 1000) * pxPerSec;

    // 보이는 영역에 필요한 프레임 수
    const visibleCount = Math.ceil((clipWidthPx + offsetPx) / frameWidthPx) + 1;

    const items: Array<{ idx: number; left: number; width: number }> = [];
    for (let i = 0; i < visibleCount; i++) {
      const frameIdx = firstFrameIdx + i;
      if (frameIdx < 0 || frameIdx >= frameCount) continue;

      const left = i * frameWidthPx - offsetPx;
      // 클립 범위 밖은 잘림 (overflow-hidden이 처리)
      items.push({ idx: frameIdx, left, width: frameWidthPx });
    }
    return { items, frameWidthPx };
  }, [trimStart, intervalMs, pxPerSec, clipWidthPx, frameCount]);

  if (!tiles || tiles.items.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {tiles.items.map(({ idx, left, width }) => (
        <img
          key={idx}
          // frame-0001.jpg (1-indexed)
          src={toFilePath(
            `${dir}/frame-${String(idx + 1).padStart(4, '0')}.jpg`
          )}
          alt=""
          draggable={false}
          className="absolute top-0 h-full object-cover"
          style={{
            left,
            width,
          }}
          loading="lazy"
        />
      ))}
    </div>
  );
});
