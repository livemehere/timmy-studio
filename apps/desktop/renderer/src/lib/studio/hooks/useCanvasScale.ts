import { useState, useEffect, type RefObject } from 'react';
import { useDocStore } from './useStudioStores';

export interface CanvasScaleInfo {
  /** DOM 실제 크기 / 논리 캔버스 크기 */
  scale: number;
  /** 캔버스 DOM 오프셋 (상위 컨테이너 내 위치) */
  offset: { x: number; y: number };
  /** 논리 캔버스 크기 */
  canvasSize: { width: number; height: number };
  /** DOM 실제 크기 */
  domSize: { width: number; height: number };
}

/**
 * 캔버스 스케일 및 오프셋 계산 hook
 * DOM 요소와 논리 캔버스 좌표 간 변환에 사용
 */
export function useCanvasScale(
  containerRef: RefObject<HTMLDivElement | null>
): CanvasScaleInfo {
  const settings = useDocStore((state) => state.settings);
  const [scaleInfo, setScaleInfo] = useState<CanvasScaleInfo>({
    scale: 1,
    offset: { x: 0, y: 0 },
    canvasSize: { width: settings.width, height: settings.height },
    domSize: { width: 0, height: 0 },
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const canvas = container.querySelector('canvas');
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // DOM 실제 크기 / 논리 캔버스 크기
      const scale = canvasRect.width / settings.width;

      // 캔버스가 컨테이너 내에서 중앙 정렬된 경우 오프셋 계산
      const offset = {
        x: canvasRect.left - containerRect.left,
        y: canvasRect.top - containerRect.top,
      };

      setScaleInfo({
        scale,
        offset,
        canvasSize: { width: settings.width, height: settings.height },
        domSize: { width: canvasRect.width, height: canvasRect.height },
      });
    };

    // 초기 계산
    updateScale();

    // ResizeObserver로 크기 변화 감지
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(container);

    // 캔버스가 나중에 추가될 수 있으므로 MutationObserver도 사용
    const mutationObserver = new MutationObserver(updateScale);
    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerRef, settings.width, settings.height]);

  return scaleInfo;
}

/**
 * 논리 캔버스 좌표 → DOM 좌표 변환
 */
export function canvasToDOM(
  canvasX: number,
  canvasY: number,
  scaleInfo: CanvasScaleInfo
): { x: number; y: number } {
  return {
    x: canvasX * scaleInfo.scale + scaleInfo.offset.x,
    y: canvasY * scaleInfo.scale + scaleInfo.offset.y,
  };
}

/**
 * DOM 좌표 → 논리 캔버스 좌표 변환
 */
export function DOMToCanvas(
  domX: number,
  domY: number,
  scaleInfo: CanvasScaleInfo
): { x: number; y: number } {
  return {
    x: (domX - scaleInfo.offset.x) / scaleInfo.scale,
    y: (domY - scaleInfo.offset.y) / scaleInfo.scale,
  };
}
