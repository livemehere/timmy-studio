import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import { TimelineTrack } from '@/lib/studio/components/Timeline/TimelineTrack';
import { useState, useRef, useCallback } from 'react';

interface SelectionRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function TimelineTracks({
  width,
  height,
  trackTitleWidth,
  trackHeight,
  pxPerSec,
}: {
  width: number;
  height: number;
  trackTitleWidth: number;
  trackHeight: number;
  pxPerSec: number;
}) {
  const tracks = useDocStore((state) => state.tracks);
  const setSelectedClipIds = useInteractionStore(
    (state) => state.setSelectedClipIds
  );

  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSelection = useRef(false);

  // 마우스 다운: 드래그 선택 시작
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // 클립이나 다른 요소가 아닌 빈 공간을 클릭했는지 확인
      const target = e.target as HTMLElement;
      const isClickOnClip =
        target.hasAttribute('data-clip-id') || target.closest('[data-clip-id]');

      if (isClickOnClip) {
        console.log('[TimelineTracks] Clicked on clip, ignoring selection');
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      // 기존 선택 해제
      setSelectedClipIds([]);

      isDraggingSelection.current = true;
      setSelectionRect({
        startX,
        startY,
        currentX: startX,
        currentY: startY,
      });

      console.log('[TimelineTracks] Selection drag started:', {
        startX,
        startY,
      });
    },
    [setSelectedClipIds]
  );

  // 마우스 무브: 선택 영역 업데이트
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSelection.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setSelectionRect((prev) => {
      if (!prev) return null;
      console.log('[TimelineTracks] Mouse move, updating rect:', {
        currentX,
        currentY,
      });
      return {
        ...prev,
        currentX,
        currentY,
      };
    });
  }, []);

  // 마우스 업: 선택 완료, 겹치는 클립 찾기
  const handleMouseUp = useCallback(() => {
    console.log(
      '[TimelineTracks] Mouse up, isDragging:',
      isDraggingSelection.current,
      'selectionRect:',
      selectionRect
    );

    if (
      !isDraggingSelection.current ||
      !selectionRect ||
      !containerRef.current
    ) {
      isDraggingSelection.current = false;
      setSelectionRect(null);
      return;
    }

    // 선택 영역의 실제 좌표 계산
    const containerRect = containerRef.current.getBoundingClientRect();
    const minX = Math.min(selectionRect.startX, selectionRect.currentX);
    const maxX = Math.max(selectionRect.startX, selectionRect.currentX);
    const minY = Math.min(selectionRect.startY, selectionRect.currentY);
    const maxY = Math.max(selectionRect.startY, selectionRect.currentY);

    const selectionBounds = {
      left: containerRect.left + minX,
      right: containerRect.left + maxX,
      top: containerRect.top + minY,
      bottom: containerRect.top + maxY,
    };

    console.log('[TimelineTracks] Selection bounds:', selectionBounds);

    // 모든 클립 요소를 찾아서 겹치는지 확인
    const clipElements =
      containerRef.current.querySelectorAll('[data-clip-id]');
    const selectedClipIds: string[] = [];

    console.log('[TimelineTracks] Found clip elements:', clipElements.length);

    clipElements.forEach((clipElement) => {
      const clipRect = clipElement.getBoundingClientRect();
      const clipId = clipElement.getAttribute('data-clip-id');

      if (!clipId) return;

      // 사각형 겹침 감지 (교집합이 있는지)
      const isOverlapping = !(
        clipRect.right < selectionBounds.left ||
        clipRect.left > selectionBounds.right ||
        clipRect.bottom < selectionBounds.top ||
        clipRect.top > selectionBounds.bottom
      );

      if (isOverlapping) {
        selectedClipIds.push(clipId);
        console.log('[TimelineTracks] Selected clip:', clipId, clipRect);
      }
    });

    console.log('[TimelineTracks] Total selected clips:', selectedClipIds);

    // 선택된 클립 ID들을 store에 저장
    setSelectedClipIds(selectedClipIds);

    // 선택 영역 초기화
    isDraggingSelection.current = false;
    setSelectionRect(null);
  }, [selectionRect, setSelectedClipIds]);

  // 선택 영역 사각형 스타일 계산
  const getSelectionRectStyle = (): React.CSSProperties | undefined => {
    if (!selectionRect) return undefined;

    const minX = Math.min(selectionRect.startX, selectionRect.currentX);
    const maxX = Math.max(selectionRect.startX, selectionRect.currentX);
    const minY = Math.min(selectionRect.startY, selectionRect.currentY);
    const maxY = Math.max(selectionRect.startY, selectionRect.currentY);

    return {
      position: 'absolute',
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
      border: '2px solid #60a5fa',
      backgroundColor: 'rgba(96, 165, 250, 0.1)',
      pointerEvents: 'none',
      zIndex: 1000,
    };
  };

  // tracks는 이미 docStore에서 zIndex 기반 정렬됨
  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        position: 'relative',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} // 마우스가 영역 밖으로 나가면 종료
    >
      {tracks.map((track) => (
        <TimelineTrack
          key={track.id}
          trackId={track.id}
          trackTitleWidth={trackTitleWidth}
          trackHeight={trackHeight}
          pxPerSec={pxPerSec}
        />
      ))}

      {/* 선택 영역 사각형 */}
      {selectionRect && <div style={getSelectionRectStyle()} />}
    </div>
  );
}
