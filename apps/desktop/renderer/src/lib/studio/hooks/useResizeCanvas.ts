import { useEffect, useRef, type RefObject } from 'react';

/**
 * Canvas 요소를 부모 요소의 크기에 맞게 자동 리사이징하는 hook
 * @param canvasRef - canvas 요소의 ref
 * @param onResize - 리사이즈 시 호출되는 콜백 (optional)
 * @returns 부모 컨테이너에 연결할 ref
 */
export function useResizeCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onResize?: (width: number, height: number) => void
): RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      onResize?.(width, height);
    };

    // 초기 리사이즈
    resizeCanvas();

    // ResizeObserver로 부모 크기 변화 감지
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [canvasRef, onResize]);

  return containerRef;
}
