import { useEffect, useRef, type RefObject } from 'react';

/**
 * Canvas 요소를 부모 요소의 크기에 맞게 자동 리사이징하는 hook
 * @param canvasRef - canvas 요소의 ref
 * @param onResize - 리사이즈 시 호출되는 콜백 (optional)
 * @param externalContainerRef - 외부에서 제공하는 컨테이너 ref (optional)
 * @returns 부모 컨테이너에 연결할 ref
 */
export function useResizeCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onResize?: (width: number, height: number) => void,
  externalContainerRef?: RefObject<HTMLDivElement | null>
): RefObject<HTMLDivElement | null> {
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef ?? internalContainerRef;

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
  }, [canvasRef, onResize, containerRef]);

  return containerRef;
}
