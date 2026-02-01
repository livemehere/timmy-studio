import { useRef } from 'react';
import { useMountRenderer } from '@/lib/studio/hooks/useMountRenderer';
import { useCanvasScale, DOMToCanvas } from '@/lib/studio/hooks/useCanvasScale';
import {
  useInteractionStore,
  useDocStore,
  useEngineStore,
} from '@/lib/studio/hooks/useStudioStores';
import { hitTestClips } from '@/lib/studio/utils/hitTest';
import { TransformOverlay } from './Preview/TransformOverlay';

export function PreviewRenderer() {
  const parentRef = useRef<HTMLDivElement | null>(null);
  useMountRenderer(parentRef);
  const scaleInfo = useCanvasScale(parentRef);

  const setSelectedClipIds = useInteractionStore(
    (state) => state.setSelectedClipIds
  );
  const tracks = useDocStore((state) => state.tracks);
  const timer = useEngineStore((state) => state.timer);

  // 캔버스 클릭 시 클립 선택 또는 선택 해제
  const handleCanvasClick = (e: React.MouseEvent) => {
    const container = parentRef.current;
    if (!container) return;

    // 클릭 좌표를 캔버스 좌표로 변환
    const containerRect = container.getBoundingClientRect();
    const domX = e.clientX - containerRect.left;
    const domY = e.clientY - containerRect.top;
    const canvasPos = DOMToCanvas(domX, domY, scaleInfo);

    // 현재 시간
    const currentTimeMs = timer?.currentMs ?? 0;

    // hitTest 수행
    const hitResult = hitTestClips(
      canvasPos.x,
      canvasPos.y,
      tracks,
      currentTimeMs
    );

    if (hitResult) {
      // 클립 선택
      setSelectedClipIds([hitResult.clipId]);
    } else {
      // 선택 해제
      setSelectedClipIds([]);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        ref={parentRef}
        className="relative w-full h-full flex items-center justify-center rounded-sm overflow-hidden shadow-2xl"
        onClick={handleCanvasClick}
      >
        {/* 🔥 Transform 오버레이 (캔버스 위에 위치) */}
        <TransformOverlay scaleInfo={scaleInfo} containerRef={parentRef} />
      </div>
    </div>
  );
}
