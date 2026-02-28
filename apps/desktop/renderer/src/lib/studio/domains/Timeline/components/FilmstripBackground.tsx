import { useMemo, memo } from 'react';
import type { IFilmstripData } from '../../Asset/types';
import { toFilePath } from '@/lib/studio/utils/toFilePath';

/**
 * 타일 밀도 가중치 — 1.0이 기본값
 * - 높일수록 타일이 넓어지고 갯수가 줄어듦 (e.g. 2.0 → 2배 넓은 타일, 프레임 1개 건너뜀)
 * - 낮출수록 타일이 좁아지고 촘촘해짐 (e.g. 0.5 → 절반 너비)
 */
const TILE_DENSITY = 3.0;

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
    // 가중치 적용된 표시 간격 (TILE_DENSITY가 클수록 한 타일이 더 넓은 시간 범위)
    const displayIntervalMs = intervalMs * TILE_DENSITY;
    const frameWidthPx = (displayIntervalMs / 1000) * pxPerSec;

    // 너무 작으면 렌더링 스킵 (성능 보호)
    if (frameWidthPx < 2 || clipWidthPx <= 0) return null;

    // trimStart 기준 첫 표시 인덱스 & 좌측 오프셋
    const firstDisplayIdx = Math.floor(trimStart / displayIntervalMs);
    const offsetPx = ((trimStart % displayIntervalMs) / 1000) * pxPerSec;

    // 보이는 영역에 필요한 타일 수
    const visibleCount = Math.ceil((clipWidthPx + offsetPx) / frameWidthPx) + 1;

    const items: Array<{ idx: number; left: number; width: number }> = [];
    for (let i = 0; i < visibleCount; i++) {
      // 표시 인덱스 → 실제 프레임 인덱스로 매핑
      const timeMs = (firstDisplayIdx + i) * displayIntervalMs;
      const frameIdx = Math.min(
        Math.round(timeMs / intervalMs),
        frameCount - 1
      );
      if (frameIdx < 0) continue;

      const left = i * frameWidthPx - offsetPx;
      items.push({ idx: frameIdx, left, width: frameWidthPx });
    }
    return { items };
  }, [trimStart, intervalMs, pxPerSec, clipWidthPx, frameCount]);

  if (!tiles || tiles.items.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {tiles.items.map(({ idx, left, width }) => (
        <img
          key={`${idx}-${left}`}
          src={toFilePath(
            `${dir}/frame-${String(idx + 1).padStart(4, '0')}.jpg`
          )}
          alt=""
          draggable={false}
          className="absolute top-0 h-full object-cover rounded-sm"
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
