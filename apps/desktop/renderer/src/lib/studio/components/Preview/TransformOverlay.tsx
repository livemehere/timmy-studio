import { useRef, useCallback, useState, useMemo } from 'react';
import {
  useDocStore,
  useInteractionStore,
  useEngineStore,
} from '../../hooks/useStudioStores';
import { findClipInTracks } from '../../utils/clipHelpers';
import type { CanvasScaleInfo } from '../../hooks/useCanvasScale';
import { DOMToCanvas } from '../../hooks/useCanvasScale';
import type { IGraphicClip, ITransform } from '../../domains/Clip/types';

type HandleType =
  | 'move'
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate';

interface TransformOverlayProps {
  scaleInfo: CanvasScaleInfo;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

// 핸들 크기 상수
const HANDLE_SIZE = 8;
const ROTATE_OFFSET = 24;

export function TransformOverlay({
  scaleInfo,
  containerRef,
}: TransformOverlayProps) {
  // 🔥 모든 hooks를 먼저 호출 (조건부 return 전에)
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);
  const tracks = useDocStore((state) => state.tracks);
  const updateClipInTrack = useDocStore((state) => state.updateClip);
  const renderer = useEngineStore((state) => state.renderer);

  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [liveTransforms, setLiveTransforms] = useState<ITransform | null>(null);
  const dragStartRef = useRef<{
    handleType: HandleType;
    startMouseX: number;
    startMouseY: number;
    startTransforms: ITransform;
    trackId: string;
    clipId: string;
  } | null>(null);

  // 선택된 클립 정보 계산
  const selectedClipId = selectedClipIds[0];
  const clipInfo = useMemo(() => {
    if (!selectedClipId) return null;
    const result = findClipInTracks(tracks, selectedClipId);
    if (!result) return null;
    if (result.clip.type === 'audio') return null;
    return {
      clip: result.clip as IGraphicClip,
      trackId: result.trackId,
    };
  }, [selectedClipId, tracks]);

  // 🔥 GraphicClip에 직접 applyTransform 호출
  const applyLiveTransform = useCallback(
    (newTransforms: ITransform) => {
      if (!renderer || !clipInfo) return;

      const graphicTrack = renderer.tracks.get(clipInfo.trackId);
      if (!graphicTrack) return;

      const clipInstance = graphicTrack.clips.get(clipInfo.clip.id);
      if (!clipInstance) return;

      // 🔥 useState로 UI도 실시간 업데이트
      setLiveTransforms(newTransforms);
      clipInstance.applyTransform(newTransforms);
    },
    [renderer, clipInfo]
  );

  // 🔥 드래그 시작
  const handleDragStart = useCallback(
    (e: React.PointerEvent, handleType: HandleType) => {
      e.stopPropagation();
      e.preventDefault();

      if (!clipInfo) return;

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const startMouseX = e.clientX - containerRect.left;
      const startMouseY = e.clientY - containerRect.top;

      dragStartRef.current = {
        handleType,
        startMouseX,
        startMouseY,
        startTransforms: JSON.parse(JSON.stringify(clipInfo.clip.transforms)),
        trackId: clipInfo.trackId,
        clipId: clipInfo.clip.id,
      };
      setLiveTransforms(JSON.parse(JSON.stringify(clipInfo.clip.transforms)));
      setIsDragging(true);

      // 캡처 시작
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [clipInfo, containerRef]
  );

  // 🔥 드래그 중
  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const currentMouseX = e.clientX - containerRect.left;
      const currentMouseY = e.clientY - containerRect.top;

      const { handleType, startMouseX, startMouseY, startTransforms } =
        dragStartRef.current;

      const { scale } = scaleInfo;

      // 마우스 이동량 (캔버스 좌표계)
      const deltaX = (currentMouseX - startMouseX) / scale;
      const deltaY = (currentMouseY - startMouseY) / scale;

      let newTransforms = { ...startTransforms };

      switch (handleType) {
        case 'move':
          newTransforms = {
            ...startTransforms,
            position: {
              x: startTransforms.position.x + deltaX,
              y: startTransforms.position.y + deltaY,
            },
          };
          break;

        case 'se': {
          const newWidth = Math.max(10, startTransforms.size.width + deltaX);
          const newHeight = Math.max(10, startTransforms.size.height + deltaY);
          newTransforms = {
            ...startTransforms,
            size: { width: newWidth, height: newHeight },
          };
          break;
        }

        case 'e': {
          const newWidth = Math.max(10, startTransforms.size.width + deltaX);
          newTransforms = {
            ...startTransforms,
            size: { ...startTransforms.size, width: newWidth },
          };
          break;
        }

        case 's': {
          const newHeight = Math.max(10, startTransforms.size.height + deltaY);
          newTransforms = {
            ...startTransforms,
            size: { ...startTransforms.size, height: newHeight },
          };
          break;
        }

        case 'nw': {
          const newWidth = Math.max(10, startTransforms.size.width - deltaX);
          const newHeight = Math.max(10, startTransforms.size.height - deltaY);
          newTransforms = {
            ...startTransforms,
            position: {
              x: startTransforms.position.x + deltaX,
              y: startTransforms.position.y + deltaY,
            },
            size: { width: newWidth, height: newHeight },
          };
          break;
        }

        case 'n': {
          const newHeight = Math.max(10, startTransforms.size.height - deltaY);
          newTransforms = {
            ...startTransforms,
            position: {
              ...startTransforms.position,
              y: startTransforms.position.y + deltaY,
            },
            size: { ...startTransforms.size, height: newHeight },
          };
          break;
        }

        case 'ne': {
          const newWidth = Math.max(10, startTransforms.size.width + deltaX);
          const newHeight = Math.max(10, startTransforms.size.height - deltaY);
          newTransforms = {
            ...startTransforms,
            position: {
              ...startTransforms.position,
              y: startTransforms.position.y + deltaY,
            },
            size: { width: newWidth, height: newHeight },
          };
          break;
        }

        case 'w': {
          const newWidth = Math.max(10, startTransforms.size.width - deltaX);
          newTransforms = {
            ...startTransforms,
            position: {
              ...startTransforms.position,
              x: startTransforms.position.x + deltaX,
            },
            size: { ...startTransforms.size, width: newWidth },
          };
          break;
        }

        case 'sw': {
          const newWidth = Math.max(10, startTransforms.size.width - deltaX);
          const newHeight = Math.max(10, startTransforms.size.height + deltaY);
          newTransforms = {
            ...startTransforms,
            position: {
              ...startTransforms.position,
              x: startTransforms.position.x + deltaX,
            },
            size: { width: newWidth, height: newHeight },
          };
          break;
        }

        case 'rotate': {
          const centerX =
            startTransforms.position.x +
            (startTransforms.size.width * startTransforms.scaleX) / 2;
          const centerY =
            startTransforms.position.y +
            (startTransforms.size.height * startTransforms.scaleY) / 2;

          const mouseCanvas = DOMToCanvas(
            currentMouseX,
            currentMouseY,
            scaleInfo
          );
          const angle = Math.atan2(
            mouseCanvas.y - centerY,
            mouseCanvas.x - centerX
          );
          const rotation = angle + Math.PI / 2;

          newTransforms = {
            ...startTransforms,
            rotation,
          };
          break;
        }
      }

      applyLiveTransform(newTransforms);
    },
    [isDragging, scaleInfo, applyLiveTransform, containerRef]
  );

  // 🔥 드래그 끝
  const handleDragEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStartRef.current || !liveTransforms) return;

      const { trackId, clipId } = dragStartRef.current;

      // Store에 커밋
      updateClipInTrack(trackId, clipId, {
        transforms: liveTransforms,
      });

      // 상태 리셋
      dragStartRef.current = null;
      setLiveTransforms(null);
      setIsDragging(false);

      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    },
    [isDragging, liveTransforms, updateClipInTrack]
  );

  // 🔥 조건부 return (모든 hooks 이후)
  if (!clipInfo) return null;

  const { clip: graphicClip } = clipInfo;
  const transforms = liveTransforms || graphicClip.transforms;
  const { scale, offset } = scaleInfo;

  // 바운딩 박스 계산
  const { position, size, scaleX, scaleY, rotation } = transforms;
  const actualWidth = size.width * scaleX;
  const actualHeight = size.height * scaleY;

  // DOM 좌표로 변환
  const boxLeft = position.x * scale + offset.x;
  const boxTop = position.y * scale + offset.y;
  const boxWidth = actualWidth * scale;
  const boxHeight = actualHeight * scale;

  // 회전 각도 (degree)
  const rotationDeg = (rotation * 180) / Math.PI;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: boxLeft,
        top: boxTop,
        width: boxWidth,
        height: boxHeight,
        transform: `rotate(${rotationDeg}deg)`,
        transformOrigin: 'center center',
      }}
      onClick={(e) => e.stopPropagation()} // 🔥 부모로 버블링 방지
    >
      {/* 바운딩 박스 */}
      <div
        className="absolute inset-0 border-2 border-blue-500 pointer-events-auto cursor-move"
        onPointerDown={(e) => handleDragStart(e, 'move')}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      />

      {/* 코너 핸들 */}
      <div
        className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-nwse-resize"
        style={{
          left: -HANDLE_SIZE / 2,
          top: -HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
        }}
        onPointerDown={(e) => handleDragStart(e, 'nw')}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      />
      <div
        className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-nesw-resize"
        style={{
          right: -HANDLE_SIZE / 2,
          top: -HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
        }}
        onPointerDown={(e) => handleDragStart(e, 'ne')}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      />
      <div
        className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-nwse-resize"
        style={{
          right: -HANDLE_SIZE / 2,
          bottom: -HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
        }}
        onPointerDown={(e) => handleDragStart(e, 'se')}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      />
      <div
        className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-nesw-resize"
        style={{
          left: -HANDLE_SIZE / 2,
          bottom: -HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
        }}
        onPointerDown={(e) => handleDragStart(e, 'sw')}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      />

      {/* 엣지 핸들 */}
      <div
        className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-ns-resize"
        style={{
          left: '50%',
          top: -HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          transform: 'translateX(-50%)',
        }}
        onPointerDown={(e) => handleDragStart(e, 'n')}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      />
      <div
        className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-ew-resize"
        style={{
          right: -HANDLE_SIZE / 2,
          top: '50%',
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          transform: 'translateY(-50%)',
        }}
        onPointerDown={(e) => handleDragStart(e, 'e')}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      />
      <div
        className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-ns-resize"
        style={{
          left: '50%',
          bottom: -HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          transform: 'translateX(-50%)',
        }}
        onPointerDown={(e) => handleDragStart(e, 's')}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      />
      <div
        className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-ew-resize"
        style={{
          left: -HANDLE_SIZE / 2,
          top: '50%',
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          transform: 'translateY(-50%)',
        }}
        onPointerDown={(e) => handleDragStart(e, 'w')}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      />

      {/* 회전 핸들 */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: '50%',
          top: -ROTATE_OFFSET,
          transform: 'translateX(-50%)',
        }}
      >
        <div
          className="absolute bg-blue-500"
          style={{
            left: '50%',
            top: HANDLE_SIZE,
            width: 1,
            height: ROTATE_OFFSET - HANDLE_SIZE,
            transform: 'translateX(-50%)',
          }}
        />
        <div
          className="bg-blue-500 rounded-full cursor-grab active:cursor-grabbing"
          style={{
            width: HANDLE_SIZE + 2,
            height: HANDLE_SIZE + 2,
          }}
          onPointerDown={(e) => handleDragStart(e, 'rotate')}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
        />
      </div>
    </div>
  );
}
