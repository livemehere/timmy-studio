import { useRef, useState, useEffect } from 'react';
import type { MotionValue } from 'motion/react';
import { useMotionValue } from 'motion/react';
import { msToSec } from '../../../utils/time';
import { Track } from '../../Track/Track';
import { Clip } from '../../Clip/Clip';
import type { IClip } from '../../Clip/types';
import type { IMediaAsset } from '../../Asset/types';
import {
  useDocStore,
  useInteractionStore,
} from '../../../hooks/useStudioStores';
import { selectAssetById } from '../../../stores/docStore';
import {
  getClipMotions,
  registerClipPreview,
  unregisterClipPreview,
  type ClipPreviewState,
} from '../clipMotionRegistry';

// 최소 클립 길이 (ms)
const MIN_CLIP_DURATION_MS = 100;

export type DragMode = 'move' | 'resize-start' | 'resize-end' | null;

export function useTimelineClipDrag({
  clip,
  trackId,
  trackHeight,
  pxPerSec,
}: {
  clip: IClip;
  trackId: string;
  trackHeight: number;
  pxPerSec: number;
}) {
  const tracks = useDocStore((state) => state.tracks);
  const addTrack = useDocStore((state) => state.addTrack);
  const updateClip = useDocStore((state) => state.updateClip);
  const moveClipToTrack = useDocStore((state) => state.moveClipToTrack);
  const cloneClipToTrack = useDocStore((state) => state.cloneClipToTrack);
  const batch = useDocStore((state) => state.batch);
  const mediaAsset = useDocStore(
    'assetId' in clip ? selectAssetById(clip.assetId) : () => undefined
  ) as IMediaAsset | undefined;

  const setActiveTrackId = useInteractionStore(
    (state) => state.setActiveTrackId
  );
  const addSelectedClipId = useInteractionStore(
    (state) => state.addSelectedClipId
  );
  const setSelectedClipId = useInteractionStore(
    (state) => state.setSelectedClipId
  );
  const setDraggingClipId = useInteractionStore(
    (state) => state.setDraggingClipId
  );
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);

  // Refs for drag state
  const clipRef = useRef<HTMLDivElement>(null);
  const wheelDeltaRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const isAltPressedRef = useRef(false);
  const dragModeRef = useRef<DragMode>(null);
  const dragStartDataRef = useRef<{
    startTime: number;
    endTime: number;
    trimStart: number;
    trimEnd: number;
    mouseX: number;
  } | null>(null);

  // Motion value for x - 리사이즈 모드에서 motion의 transform을 비활성화
  const motionX = useMotionValue(0);

  // Multi-drag: follower MotionValues cached at drag start
  const followerMotionsRef = useRef<
    Map<string, { motionX: MotionValue<number>; trackId: string }>
  >(new Map());
  const isMultiDragRef = useRef(false);

  // UI states
  const [isCloneMode, setIsCloneMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [isMultiDrag, setIsMultiDrag] = useState(false);

  // 🔥 로컬 드래그 상태 - 드래그 중 store 업데이트 없이 UI만 업데이트
  const [localDragState, setLocalDragState] = useState<{
    startTime: number;
    endTime: number;
    trimStart: number;
    trimEnd: number;
  } | null>(null);

  // Properties 패널 등 외부에서 실시간 프리뷰를 위해 localDragState를 조작하는 콜백 등록
  useEffect(() => {
    const handlePreview = (preview: ClipPreviewState | null) => {
      if (preview === null) {
        setLocalDragState(null);
        return;
      }
      setLocalDragState({
        startTime: preview.startTime ?? clip.startTime,
        endTime: preview.endTime ?? clip.endTime,
        trimStart: preview.trimStart ?? clip.trimStart,
        trimEnd: preview.trimEnd ?? clip.trimEnd,
      });
    };
    registerClipPreview(clip.id, handlePreview);
    return () => unregisterClipPreview(clip.id);
  }, [clip.id, clip.startTime, clip.endTime, clip.trimStart, clip.trimEnd]);

  // 드래그 중이면 로컬 상태 사용, 아니면 store 값 사용
  const displayStartTime = localDragState?.startTime ?? clip.startTime;
  const displayEndTime = localDragState?.endTime ?? clip.endTime;
  const displayTrimStart = localDragState?.trimStart ?? clip.trimStart;
  const displayTrimEnd = localDragState?.trimEnd ?? clip.trimEnd;

  // trim을 고려한 실제 보이는 시간 범위 계산
  const actualRange = localDragState
    ? Clip.getActualTimeRange({
        ...clip,
        startTime: localDragState.startTime,
        endTime: localDragState.endTime,
        trimStart: localDragState.trimStart,
        trimEnd: localDragState.trimEnd,
      })
    : Clip.getActualTimeRange(clip);

  // 표시용 width/left 계산 (trim 고려)
  const displayWidth = msToSec(actualRange.end - actualRange.start) * pxPerSec;
  const displayLeft = msToSec(actualRange.start) * pxPerSec;

  // 리사이즈 모드가 끝나면 motionX를 0으로 리셋
  useEffect(() => {
    if (!isDragging || dragMode === null) {
      motionX.set(0);
    }
  }, [dragMode, isDragging, motionX]);

  const _determineDragMode = (e: React.PointerEvent): DragMode => {
    const target = e.target as HTMLElement;
    const resizeHandle = target.closest('[data-resize-handle]');
    if (resizeHandle) {
      const handleType = resizeHandle.getAttribute('data-resize-handle');
      if (handleType === 'start') return 'resize-start';
      if (handleType === 'end') return 'resize-end';
    }
    return 'move';
  };

  const _isResizingMode = (mode: DragMode) => {
    return mode === 'resize-start' || mode === 'resize-end';
  };

  const _normalizeTrackType = (type?: string): 'graphic' | 'audio' => {
    return type === 'audio' ? 'audio' : 'graphic';
  };

  const _hasOverlapInTrack = (
    targetTrackId: string,
    startTime: number,
    endTime: number
  ) => {
    const targetTrack = tracks.find((track) => track.id === targetTrackId);
    if (!targetTrack) return false;

    return targetTrack.clips.some((existingClip) => {
      return !(
        endTime <= existingClip.startTime || startTime >= existingClip.endTime
      );
    });
  };

  const _setDragMode = (mode: DragMode) => {
    dragModeRef.current = mode;
    setDragMode(mode);
  };

  const _setIsDragging = (dragging: boolean) => {
    isDraggingRef.current = dragging;
    setIsDragging(dragging);
  };

  const _getMediaAssetDurationMs = (): number | null => {
    if ('assetId' in clip && mediaAsset) {
      return mediaAsset.metadata.durationMs;
    }
    // 미디어 에셋이 없는 클립은 최대 길이 제약 없음
    return null;
  };

  const _resetResizeState = () => {
    _setIsDragging(false);
    _setDragMode(null);
    setDraggingClipId(null);
    dragStartDataRef.current = null;
  };

  // 리사이징 모드 시작 핸들러
  const handlePointerDown = (e: React.PointerEvent) => {
    const mode = _determineDragMode(e);
    _setDragMode(mode);

    // 리사이즈 모드면 드래그 데이터 저장 및 이벤트 캡처
    if (_isResizingMode(mode)) {
      e.preventDefault();
      e.stopPropagation();
      _setIsDragging(true);
      setDraggingClipId(clip.id);

      if (clipRef.current) {
        clipRef.current.setPointerCapture(e.pointerId);
      }

      dragStartDataRef.current = {
        startTime: clip.startTime,
        endTime: clip.endTime,
        trimStart: clip.trimStart,
        trimEnd: clip.trimEnd,
        mouseX: e.clientX,
      };
    }

    // move 모드는 handleDragStart에서 처리
  };

  // 리사이징 모드 진행 핸들러
  const handlePointerMove = (e: React.PointerEvent) => {
    const mode = dragModeRef.current;
    if (!isDraggingRef.current || !dragStartDataRef.current) return;
    if (!_isResizingMode(mode)) return;

    const deltaX = e.clientX - dragStartDataRef.current.mouseX;
    const deltaMs = (deltaX / pxPerSec) * 1000;

    // 미디어 에셋을 가진 경우, 해당 duration 이 최대 간격
    const mediaAssetDuration = _getMediaAssetDurationMs();

    if (mode === 'resize-start') {
      if (mediaAssetDuration) {
        // 미디어 클립: startTime은 고정, trimStart만 조절 (클리핑)
        // 오른쪽으로 드래그(+) = trimStart 증가 (앞부분 잘라냄)
        // 왼쪽으로 드래그(-) = trimStart 감소 (앞부분 더 보여줌)
        let newTrimStart = dragStartDataRef.current.trimStart + deltaMs;

        // trimStart 제약: 0 이상, mediaAssetDuration - trimEnd - MIN_CLIP_DURATION_MS 이하
        const maxTrimStart =
          mediaAssetDuration -
          dragStartDataRef.current.trimEnd -
          MIN_CLIP_DURATION_MS;
        newTrimStart = Math.max(0, Math.min(maxTrimStart, newTrimStart));

        setLocalDragState({
          startTime: dragStartDataRef.current.startTime,
          endTime: dragStartDataRef.current.endTime,
          trimStart: newTrimStart,
          trimEnd: dragStartDataRef.current.trimEnd,
        });
      } else {
        // 일반 클립: startTime만 조절, trim은 0 유지
        let newStartTime = dragStartDataRef.current.startTime + deltaMs;

        // startTime 제약
        const minStart = 0;
        const maxStart =
          dragStartDataRef.current.endTime - MIN_CLIP_DURATION_MS;
        newStartTime = Math.max(minStart, Math.min(maxStart, newStartTime));

        setLocalDragState({
          startTime: newStartTime,
          endTime: dragStartDataRef.current.endTime,
          trimStart: 0,
          trimEnd: 0,
        });
      }
    } else if (mode === 'resize-end') {
      if (mediaAssetDuration) {
        // 미디어 클립: endTime은 고정, trimEnd만 조절 (클리핑)
        // 오른쪽으로 드래그(+) = trimEnd 감소 (뒷부분 더 보여줌)
        // 왼쪽으로 드래그(-) = trimEnd 증가 (뒷부분 잘라냄)
        let newTrimEnd = dragStartDataRef.current.trimEnd - deltaMs;

        // trimEnd 제약: 0 이상, mediaAssetDuration - trimStart - MIN_CLIP_DURATION_MS 이하
        const maxTrimEnd =
          mediaAssetDuration -
          dragStartDataRef.current.trimStart -
          MIN_CLIP_DURATION_MS;
        newTrimEnd = Math.max(0, Math.min(maxTrimEnd, newTrimEnd));

        setLocalDragState({
          startTime: dragStartDataRef.current.startTime,
          endTime: dragStartDataRef.current.endTime,
          trimStart: dragStartDataRef.current.trimStart,
          trimEnd: newTrimEnd,
        });
      } else {
        // 일반 클립: endTime만 조절, trim은 0 유지
        let newEndTime = dragStartDataRef.current.endTime + deltaMs;

        // endTime 제약
        const minEnd =
          dragStartDataRef.current.startTime + MIN_CLIP_DURATION_MS;
        newEndTime = Math.max(minEnd, newEndTime);

        setLocalDragState({
          startTime: dragStartDataRef.current.startTime,
          endTime: newEndTime,
          trimStart: 0,
          trimEnd: 0,
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const mode = dragModeRef.current;
    if (_isResizingMode(mode)) {
      if (clipRef.current) {
        clipRef.current.releasePointerCapture(e.pointerId);
      }

      // 🔥 드래그 종료 시 로컬 상태를 store에 커밋
      if (localDragState) {
        updateClip(trackId, clip.id, {
          startTime: localDragState.startTime,
          endTime: localDragState.endTime,
          trimStart: localDragState.trimStart,
          trimEnd: localDragState.trimEnd,
        });
        setLocalDragState(null);
      }

      _resetResizeState();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    const mode = dragModeRef.current;
    if (_isResizingMode(mode)) {
      if (clipRef.current) {
        clipRef.current.releasePointerCapture(e.pointerId);
      }

      // 🔥 취소 시 로컬 상태 버림 (store 업데이트 안함)
      setLocalDragState(null);

      _resetResizeState();
    }
  };

  const handleDragStart = (e: MouseEvent | TouchEvent | PointerEvent) => {
    console.log('drag start', dragModeRef.current);
    if (dragModeRef.current !== 'move' && dragModeRef.current !== null) {
      return;
    }

    setDraggingClipId(clip.id);
    isDraggingRef.current = true;
    setIsDragging(true);
    dragModeRef.current = 'move';
    setDragMode('move');
    wheelDeltaRef.current = { x: 0, y: 0 };
    // @ts-ignore - e.altKey exists in drag events
    const altPressed = e.altKey || false;
    isAltPressedRef.current = altPressed;
    setIsCloneMode(altPressed);

    // Multi-drag: 이 클립이 선택된 클립 그룹에 포함되면 follower들 캐싱
    const isPartOfSelection =
      selectedClipIds.length > 1 && selectedClipIds.includes(clip.id);
    isMultiDragRef.current = isPartOfSelection;
    setIsMultiDrag(isPartOfSelection);

    if (isPartOfSelection) {
      const followerIds = selectedClipIds.filter((id) => id !== clip.id);
      followerMotionsRef.current = getClipMotions(followerIds);
    } else {
      followerMotionsRef.current = new Map();
    }
  };

  const handleDrag = (
    e: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number } }
  ) => {
    if (dragModeRef.current !== 'move') return;

    // @ts-ignore - e.altKey exists in drag events
    const altPressed = e.altKey || false;
    isAltPressedRef.current = altPressed;
    setIsCloneMode(altPressed);

    // Multi-drag: leader의 offset을 follower들에게 전파 (MotionValue → no re-render)
    if (isMultiDragRef.current) {
      const offsetX = info.offset.x + wheelDeltaRef.current.x;
      followerMotionsRef.current.forEach((entry) => {
        entry.motionX.set(offsetX);
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isDraggingRef.current && dragModeRef.current === 'move') {
      e.preventDefault();
      wheelDeltaRef.current.x += e.deltaX;
      wheelDeltaRef.current.y += e.deltaY;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // 리사이즈 중이면 클릭 무시
    if (_isResizingMode(dragModeRef.current)) {
      return;
    }

    // Set the parent track as active when clicking a clip
    setActiveTrackId(trackId);

    if (e.shiftKey) {
      addSelectedClipId(clip.id);
    } else {
      setSelectedClipId(clip.id);
    }
  };

  /**
   * Follower 클립들의 motionX 를 리셋한다.
   * motion의 dragSnapToOrigin이 leader만 처리하므로, followers는 직접 리셋해야 한다.
   */
  const _resetFollowers = () => {
    followerMotionsRef.current.forEach((entry) => {
      entry.motionX.set(0);
    });
    followerMotionsRef.current = new Map();
    isMultiDragRef.current = false;
    setIsMultiDrag(false);
  };

  /**
   * 여러 클립을 동시에 같은 deltaMs만큼 이동한다 (same-track only, 수평 이동).
   * immer batch 1회로 처리하여 re-render 1회로 끝낸다.
   */
  const _commitMultiDrag = (deltaMs: number) => {
    batch((draft) => {
      // leader 포함 전체 selectedClipIds 처리
      for (const selClipId of selectedClipIds) {
        // followerMotionsRef에서 trackId를 가져오거나, leader인 경우 현재 trackId 사용
        const followerEntry = followerMotionsRef.current.get(selClipId);
        const clipTrackId =
          selClipId === clip.id ? trackId : followerEntry?.trackId;
        if (!clipTrackId) continue;

        const draftTrack = draft.tracks.find((t) => t.id === clipTrackId);
        if (!draftTrack) continue;

        const draftClip = (draftTrack.clips as IClip[]).find(
          (c) => c.id === selClipId
        );
        if (!draftClip) continue;

        const duration = draftClip.endTime - draftClip.startTime;
        const newStart = Math.max(0, draftClip.startTime + deltaMs);
        draftClip.startTime = newStart;
        draftClip.endTime = newStart + duration;
      }
    });
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number } }
  ) => {
    if (dragModeRef.current !== 'move') {
      dragModeRef.current = null;
      setDragMode(null);
      _resetFollowers();
      return;
    }
    const isCloning = isAltPressedRef.current;
    isDraggingRef.current = false;
    setIsDragging(false);
    setDraggingClipId(null);
    setIsCloneMode(false);

    const totalOffsetX = info.offset.x + wheelDeltaRef.current.x;
    const totalOffsetY = info.offset.y + wheelDeltaRef.current.y;

    const deltaStartTime = (totalOffsetX / pxPerSec) * 1000;

    // ── Multi-drag path (같은 트랙 내 수평 이동, 복제 아닌 경우) ──
    const trackIndexDelta = Math.round(totalOffsetY / trackHeight);
    if (isMultiDragRef.current && !isCloning && trackIndexDelta === 0) {
      _commitMultiDrag(deltaStartTime);

      _resetFollowers();
      setActiveTrackId(trackId);
      dragModeRef.current = null;
      setDragMode(null);
      return;
    }

    // Multi-drag 였지만 cross-track이나 clone 같은 복잡한 경우 → followers 리셋하고 leader만 단건 처리
    _resetFollowers();

    const newStartTime = Math.max(0, clip.startTime + deltaStartTime);
    const newEndTime = newStartTime + (clip.endTime - clip.startTime);

    console.log('[TimelineClip] Drag end:', {
      isCloning,
      clipId: clip.id,
      originalTime: { start: clip.startTime, end: clip.endTime },
      newTime: { start: newStartTime, end: newEndTime },
    });

    // 트랙 간 이동/복제 로직

    if (trackIndexDelta !== 0) {
      // 현재 트랙의 인덱스 찾기
      const currentTrackIndex = tracks.findIndex((t) => t.id === trackId);
      const targetTrackIndex = currentTrackIndex + trackIndexDelta;

      // 타겟 트랙이 존재하는 경우 이동/복제
      if (targetTrackIndex >= 0 && targetTrackIndex < tracks.length) {
        const clipTrackType = _normalizeTrackType(clip.type);
        const targetTrack = tracks[targetTrackIndex];
        const targetTrackType = _normalizeTrackType(targetTrack.type);

        if (targetTrackType !== clipTrackType) {
          dragModeRef.current = null;
          setDragMode(null);
          return;
        }

        if (isCloning) {
          if (_hasOverlapInTrack(targetTrack.id, newStartTime, newEndTime)) {
            dragModeRef.current = null;
            setDragMode(null);
            return;
          }

          // Alt 키가 눌려있으면 복제
          cloneClipToTrack(
            trackId,
            targetTrack.id,
            clip.id,
            newStartTime,
            newEndTime
          );
        } else {
          // Alt 키가 안 눌려있으면 이동
          moveClipToTrack(trackId, targetTrack.id, clip.id);
          // 타겟 트랙에서 시간 업데이트
          updateClip(targetTrack.id, clip.id, {
            startTime: newStartTime,
            endTime: newEndTime,
          });
        }
        setActiveTrackId(targetTrack.id);
        return;
      }

      // 타겟 트랙이 없으면 새로 생성 (중간 빈 트랙 포함)
      if (targetTrackIndex >= tracks.length || targetTrackIndex < 0) {
        const trackType = _normalizeTrackType(clip.type);

        const newTracks = [];
        let targetTrackId = '';

        if (targetTrackIndex >= tracks.length) {
          // 아래로 이동 - 필요한 만큼 트랙 생성
          const tracksToCreate = targetTrackIndex - tracks.length + 1;
          // 가장 낮은 zIndex 찾기
          const minZIndex = Math.min(...tracks.map((t) => t.zIndex));

          for (let i = 0; i < tracksToCreate; i++) {
            const newTrack = Track.create(trackType);
            // 아래로 갈수록 zIndex 감소: minZIndex-1, minZIndex-2, ...
            newTrack.zIndex = minZIndex - (i + 1);
            newTracks.push(newTrack);

            // 마지막 트랙이 타겟 트랙
            if (i === tracksToCreate - 1) {
              targetTrackId = newTrack.id;
            }
          }
        } else if (targetTrackIndex < 0) {
          // 위로 이동 - 필요한 만큼 트랙 생성
          const tracksToCreate = Math.abs(targetTrackIndex);
          // 가장 높은 zIndex 찾기
          const maxZIndex = Math.max(...tracks.map((t) => t.zIndex));

          for (let i = 0; i < tracksToCreate; i++) {
            const newTrack = Track.create(trackType);
            // 위로 갈수록 zIndex 증가: maxZIndex+1, maxZIndex+2, ...
            newTrack.zIndex = maxZIndex + (i + 1);
            newTracks.push(newTrack);

            // 마지막 트랙이 타겟 트랙 (가장 위)
            if (i === tracksToCreate - 1) {
              targetTrackId = newTrack.id;
            }
          }
        }

        // 트랙 추가
        addTrack(newTracks);

        if (isCloning) {
          // Alt 키가 눌려있으면 복제
          cloneClipToTrack(
            trackId,
            targetTrackId,
            clip.id,
            newStartTime,
            newEndTime
          );
        } else {
          // Alt 키가 안 눌려있으면 이동
          moveClipToTrack(trackId, targetTrackId, clip.id);
          // 시간 업데이트
          updateClip(targetTrackId, clip.id, {
            startTime: newStartTime,
            endTime: newEndTime,
          });
        }
        setActiveTrackId(targetTrackId);
        return;
      }
    }

    // 같은 트랙 내에서 시간만 변경 (복제 모드면 복제)
    if (isCloning) {
      if (_hasOverlapInTrack(trackId, newStartTime, newEndTime)) {
        dragModeRef.current = null;
        setDragMode(null);
        return;
      }

      // 같은 트랙에 복제
      cloneClipToTrack(trackId, trackId, clip.id, newStartTime, newEndTime);
    } else {
      // 같은 트랙 내에서 시간만 이동
      updateClip(trackId, clip.id, {
        startTime: newStartTime,
        endTime: newEndTime,
      });
    }
    setActiveTrackId(trackId);

    // Reset drag mode
    dragModeRef.current = null;
    setDragMode(null);
  };

  return {
    clipRef,
    motionX,
    isCloneMode,
    isDragging,
    isMultiDrag,
    dragMode,
    displayStartTime,
    displayEndTime,
    displayTrimStart,
    displayTrimEnd,
    displayWidth,
    displayLeft,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleDragStart,
    handleDrag,
    handleWheel,
    handleClick,
    handleDragEnd,
  };
}
