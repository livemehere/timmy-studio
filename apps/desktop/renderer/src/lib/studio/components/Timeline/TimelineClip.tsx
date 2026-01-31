import { motion, useMotionValue } from 'motion/react';
import { useRef, useState, useCallback, useEffect } from 'react';
import {
  useDocStore,
  useEngineStore,
  useInteractionStore,
} from '../../hooks/useStudioStores';
import { msToSec } from '../../utils/time';
import type {
  IVideoClip,
  IAudioClip,
  IClip,
} from '@/lib/studio/domains/Clip/types';
import { cn } from '@/lib/utils';
import { Track } from '@/lib/studio/domains/Track/Track';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { toast } from 'sonner';
import {
  Copy,
  Scissors,
  Trash2,
  Files,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';

// 최소 클립 길이 (ms)
const MIN_CLIP_DURATION_MS = 100;
// 엣지 드래그 감지 영역 (px)
const EDGE_DRAG_ZONE_PX = 8;

type DragMode = 'move' | 'resize-start' | 'resize-end' | null;

export function TimelineClip({
  clipId,
  pxPerSec,
  trackId,
  trackHeight,
}: {
  clipId: string;
  pxPerSec: number;
  trackId: string;
  trackHeight: number;
}) {
  const getClipById = useDocStore((state) => state.getClipById);
  const getTrackById = useDocStore((state) => state.getTrackById);
  const getAssetById = useDocStore((state) => state.getAssetById);
  const updateClip = useDocStore((state) => state.updateClip);
  const moveClipToTrack = useDocStore((state) => state.moveClipToTrack);
  const cloneClipToTrack = useDocStore((state) => state.cloneClipToTrack);
  const removeClip = useDocStore((state) => state.removeClip);
  const addTrack = useDocStore((state) => state.addTrack);
  const tracks = useDocStore((state) => state.tracks);
  const setActiveTrackId = useDocStore((state) => state.setActiveTrackId);
  // Use IClip to support both graphic and audio clips
  const clip = getClipById<IClip>(trackId, clipId)!;

  const track = getTrackById(trackId);
  const syncedGraphicClipIds = useEngineStore(
    (state) => state.syncedGraphicClipIds || []
  );
  const failedGraphicClipIds = useEngineStore(
    (state) => state.failedGraphicClipIds || []
  );
  const syncedAudioClipIds = useEngineStore(
    (state) => state.syncedAudioClipIds || []
  );
  const failedAudioClipIds = useEngineStore(
    (state) => state.failedAudioClipIds || []
  );

  const syncedClipIds =
    track?.type === 'audio' ? syncedAudioClipIds : syncedGraphicClipIds;
  const failedClipIds =
    track?.type === 'audio' ? failedAudioClipIds : failedGraphicClipIds;

  const isLoaded = syncedClipIds.includes(clipId);
  const isFailed = failedClipIds.includes(clipId);

  const width = msToSec(clip.endTime - clip.startTime) * pxPerSec;
  const left = msToSec(clip.startTime) * pxPerSec;

  const isSelected = useInteractionStore((state) =>
    state.selectedClipIds.includes(clip.id)
  );
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);
  const setSelectedClipId = useInteractionStore(
    (state) => state.setSelectedClipId
  );
  const setSelectedClipIds = useInteractionStore(
    (state) => state.setSelectedClipIds
  );

  const addSelectedClipId = useInteractionStore(
    (state) => state.addSelectedClipId
  );
  const setDraggingClipId = useInteractionStore(
    (state) => state.setDraggingClipId
  );
  const setHoverTrackId = useInteractionStore((state) => state.setHoverTrackId);
  const setClipboard = useInteractionStore((state) => state.setClipboard);

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

  // UI states
  const [isCloneMode, setIsCloneMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [hoverEdge, setHoverEdge] = useState<'start' | 'end' | null>(null);

  // 리사이즈 모드가 끝나면 motionX를 0으로 리셋
  useEffect(() => {
    if (!isDragging || dragMode === null) {
      motionX.set(0);
    }
  }, [isDragging, dragMode, motionX]);

  // Get asset duration for video/audio clips
  const getMaxDuration = useCallback((): number | null => {
    if (clip.type === 'video' || clip.type === 'audio') {
      const assetId = (clip as IVideoClip | IAudioClip).assetId;
      const asset = getAssetById(assetId);
      if (asset?.metadata?.durationMs) {
        return asset.metadata.durationMs;
      }
    }
    return null; // unlimited for non-video/audio clips
  }, [clip, getAssetById]);

  // Determine drag mode based on mouse position
  const getDragModeFromPosition = useCallback(
    (e: React.MouseEvent | React.PointerEvent): DragMode => {
      if (!clipRef.current) return 'move';

      const rect = clipRef.current.getBoundingClientRect();
      const localX = e.clientX - rect.left;

      if (localX <= EDGE_DRAG_ZONE_PX) {
        return 'resize-start';
      } else if (localX >= rect.width - EDGE_DRAG_ZONE_PX) {
        return 'resize-end';
      }
      return 'move';
    },
    []
  );

  // Handle mouse move for cursor change
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDraggingRef.current) return;

      const mode = getDragModeFromPosition(e);
      if (mode === 'resize-start') {
        setHoverEdge('start');
      } else if (mode === 'resize-end') {
        setHoverEdge('end');
      } else {
        setHoverEdge(null);
      }
    },
    [getDragModeFromPosition]
  );

  const handleMouseLeave = useCallback(() => {
    if (!isDraggingRef.current) {
      setHoverEdge(null);
    }
  }, []);

  // Context menu actions
  const handleCopy = () => {
    // 선택된 클립이 여러 개인 경우
    if (selectedClipIds.length > 1) {
      const clipDataArray: Array<{
        clip: any;
        trackId: string;
        startTime: number;
      }> = [];

      selectedClipIds.forEach((clipId) => {
        const trackWithClip = tracks.find((track) =>
          track.clips.some((c) => c.id === clipId)
        );

        if (trackWithClip) {
          const foundClip = trackWithClip.clips.find((c) => c.id === clipId);
          if (foundClip) {
            clipDataArray.push({
              clip: JSON.parse(JSON.stringify(foundClip)),
              trackId: trackWithClip.id,
              startTime: foundClip.startTime,
            });
          }
        }
      });

      if (clipDataArray.length > 0) {
        const minStartTime = Math.min(...clipDataArray.map((d) => d.startTime));
        const clipsWithRelativeTime = clipDataArray.map((d) => ({
          clip: d.clip,
          trackId: d.trackId,
          relativeStartTime: d.startTime - minStartTime,
        }));

        setClipboard({
          clips: clipsWithRelativeTime,
          operation: 'copy',
        });

        console.log('[TimelineClip] Copied clips:', clipDataArray.length);
        toast.success(`${clipDataArray.length} clips copied`, {
          description: 'Press ⌘V to paste',
        });
      }
    } else {
      // 단일 클립 복사
      const clipData = JSON.parse(JSON.stringify(clip));
      setClipboard({
        clips: [
          {
            clip: clipData,
            trackId: trackId,
            relativeStartTime: 0,
          },
        ],
        operation: 'copy',
      });
      console.log('[TimelineClip] Copied clip data:', clip.id);
      toast.success('Clip copied', { description: 'Press ⌘V to paste' });
    }
  };

  const handleCut = () => {
    // 선택된 클립이 여러 개인 경우
    if (selectedClipIds.length > 1) {
      const clipDataArray: Array<{
        clip: any;
        trackId: string;
        startTime: number;
      }> = [];

      selectedClipIds.forEach((clipId) => {
        const trackWithClip = tracks.find((track) =>
          track.clips.some((c) => c.id === clipId)
        );

        if (trackWithClip) {
          const foundClip = trackWithClip.clips.find((c) => c.id === clipId);
          if (foundClip) {
            clipDataArray.push({
              clip: JSON.parse(JSON.stringify(foundClip)),
              trackId: trackWithClip.id,
              startTime: foundClip.startTime,
            });
          }
        }
      });

      if (clipDataArray.length > 0) {
        const minStartTime = Math.min(...clipDataArray.map((d) => d.startTime));
        const clipsWithRelativeTime = clipDataArray.map((d) => ({
          clip: d.clip,
          trackId: d.trackId,
          relativeStartTime: d.startTime - minStartTime,
        }));

        setClipboard({
          clips: clipsWithRelativeTime,
          operation: 'cut',
        });

        // Cut은 즉시 원본 삭제
        clipDataArray.forEach((d) => {
          removeClip(d.trackId, d.clip.id);
        });

        console.log('[TimelineClip] Cut clips:', clipDataArray.length);
        toast.info(`${clipDataArray.length} clips cut`, {
          description: 'Press ⌘V to paste',
        });
      }
    } else {
      // 단일 클립 잘라내기
      const clipData = JSON.parse(JSON.stringify(clip));
      setClipboard({
        clips: [
          {
            clip: clipData,
            trackId: trackId,
            relativeStartTime: 0,
          },
        ],
        operation: 'cut',
      });
      // Cut은 즉시 원본 삭제
      removeClip(trackId, clip.id);
      console.log('[TimelineClip] Cut (removed) and saved data:', clip.id);
      toast.info('Clip cut', { description: 'Press ⌘V to paste' });
    }
  };

  const handleDuplicate = () => {
    const newStartTime = clip.endTime;
    const newEndTime = newStartTime + (clip.endTime - clip.startTime);

    try {
      const newClipId = cloneClipToTrack(
        trackId,
        trackId,
        clip.id,
        newStartTime,
        newEndTime
      );

      if (newClipId) {
        setSelectedClipIds([newClipId]);
        console.log('[TimelineClip] Duplicated:', newClipId);
      }
    } catch (error) {
      console.error('[TimelineClip] Duplicate failed:', error);
    }
  };

  const handleDelete = () => {
    removeClip(trackId, clip.id);
    console.log('[TimelineClip] Deleted:', clip.id);
  };

  const handleToggleLock = () => {
    updateClip(trackId, clip.id, {
      locked: !clip.locked,
    });
    console.log('[TimelineClip] Toggled lock:', clip.id, !clip.locked);
  };

  const handleToggleVisibility = () => {
    updateClip(trackId, clip.id, {
      enabled: !clip.enabled,
    });
    console.log('[TimelineClip] Toggled visibility:', clip.id, !clip.enabled);
  };

  const handleContextMenuOpen = (open: boolean) => {
    if (open) {
      // 우클릭 시 이 클립을 선택
      if (!selectedClipIds.includes(clip.id)) {
        setSelectedClipIds([clip.id]);
      }
    }
  };

  return (
    <>
      {/* Ghost Element: Alt 키로 복제 중일 때 원본 위치에 표시 */}
      {isCloneMode && isDragging && dragMode === 'move' && (
        <div
          className="absolute h-full bg-cyan-700/30 px-2 py-1 rounded overflow-hidden pointer-events-none border-2 border-dashed border-cyan-400/50"
          style={{
            width,
            left,
          }}
        >
          <span className="text-cyan-200/50 text-xs">{clip.name}</span>
        </div>
      )}

      <ContextMenu onOpenChange={handleContextMenuOpen}>
        <ContextMenuTrigger asChild>
          <motion.div
            ref={clipRef}
            data-clip-id={clip.id}
            style={{
              width,
              left,
              x:
                dragMode === 'resize-start' || dragMode === 'resize-end'
                  ? 0
                  : motionX,
              cursor: hoverEdge
                ? 'ew-resize'
                : isDragging && dragMode === 'move'
                  ? 'grabbing'
                  : 'grab',
            }}
            // 리사이즈 모드에서는 드래그 완전 비활성화
            drag={dragMode === 'move' || dragMode === null ? 'x' : false}
            dragMomentum={false}
            dragSnapToOrigin={dragMode === 'move'}
            dragElastic={0}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onPointerDown={(e) => {
              const mode = getDragModeFromPosition(e);
              dragModeRef.current = mode;
              setDragMode(mode);

              // 리사이즈 모드면 드래그 데이터 저장 및 이벤트 캡처
              if (mode === 'resize-start' || mode === 'resize-end') {
                e.preventDefault();
                e.stopPropagation();

                // clipRef에서 pointer capture
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
                isDraggingRef.current = true;
                setIsDragging(true);
                setDraggingClipId(clip.id);
              }
            }}
            onPointerMove={(e) => {
              const mode = dragModeRef.current;
              if (!isDraggingRef.current || !dragStartDataRef.current) return;
              if (mode !== 'resize-start' && mode !== 'resize-end') return;

              const deltaX = e.clientX - dragStartDataRef.current.mouseX;
              const deltaMsRaw = (deltaX / pxPerSec) * 1000;

              const maxDuration = getMaxDuration();
              const isVideoOrAudio =
                clip.type === 'video' || clip.type === 'audio';

              if (mode === 'resize-start') {
                // 시작점 드래그: startTime 조절
                let newStartTime =
                  dragStartDataRef.current.startTime + deltaMsRaw;

                // 최소/최대 제약
                const minStart = 0;
                const maxStart =
                  dragStartDataRef.current.endTime - MIN_CLIP_DURATION_MS;
                newStartTime = Math.max(
                  minStart,
                  Math.min(maxStart, newStartTime)
                );

                // VideoClip의 경우 trimStart도 조절
                if (isVideoOrAudio && maxDuration) {
                  const originalDuration =
                    dragStartDataRef.current.endTime -
                    dragStartDataRef.current.startTime;
                  const newDuration =
                    dragStartDataRef.current.endTime - newStartTime;
                  const durationDelta = newDuration - originalDuration;

                  // trimStart 감소 = 더 많이 보여줌 (왼쪽으로 확장)
                  let newTrimStart =
                    dragStartDataRef.current.trimStart - durationDelta;

                  // trimStart는 0 이상이어야 함
                  if (newTrimStart < 0) {
                    // trimStart가 0 미만이 되려고 하면 startTime을 조절
                    newStartTime =
                      dragStartDataRef.current.startTime +
                      dragStartDataRef.current.trimStart;
                    newTrimStart = 0;
                  }

                  updateClip(trackId, clip.id, {
                    startTime: newStartTime,
                    trimStart: newTrimStart,
                  });
                } else {
                  // 일반 클립은 단순히 startTime만 조절
                  updateClip(trackId, clip.id, {
                    startTime: newStartTime,
                  });
                }
              } else if (mode === 'resize-end') {
                // 끝점 드래그: endTime 조절
                let newEndTime = dragStartDataRef.current.endTime + deltaMsRaw;

                // 최소 제약
                const minEnd =
                  dragStartDataRef.current.startTime + MIN_CLIP_DURATION_MS;
                newEndTime = Math.max(minEnd, newEndTime);

                // VideoClip의 경우 최대 길이 제약 + trimEnd 조절
                if (isVideoOrAudio && maxDuration) {
                  const originalDuration =
                    dragStartDataRef.current.endTime -
                    dragStartDataRef.current.startTime;
                  const newDuration =
                    newEndTime - dragStartDataRef.current.startTime;
                  const durationDelta = newDuration - originalDuration;

                  // trimEnd 감소 = 더 많이 보여줌 (오른쪽으로 확장)
                  let newTrimEnd =
                    dragStartDataRef.current.trimEnd - durationDelta;

                  // trimEnd는 0 이상이어야 함
                  if (newTrimEnd < 0) {
                    // trimEnd가 0 미만이 되려고 하면 endTime을 조절
                    newEndTime =
                      dragStartDataRef.current.startTime +
                      (maxDuration - dragStartDataRef.current.trimStart);
                    newTrimEnd = 0;
                  }

                  updateClip(trackId, clip.id, {
                    endTime: newEndTime,
                    trimEnd: newTrimEnd,
                  });
                } else {
                  // 일반 클립은 단순히 endTime만 조절 (무제한)
                  updateClip(trackId, clip.id, {
                    endTime: newEndTime,
                  });
                }
              }
            }}
            onPointerUp={(e) => {
              const mode = dragModeRef.current;
              if (mode === 'resize-start' || mode === 'resize-end') {
                if (clipRef.current) {
                  clipRef.current.releasePointerCapture(e.pointerId);
                }
                isDraggingRef.current = false;
                setIsDragging(false);
                setDraggingClipId(null);
                dragStartDataRef.current = null;
                dragModeRef.current = null;
                setDragMode(null);
              }
            }}
            onPointerCancel={(e) => {
              const mode = dragModeRef.current;
              if (mode === 'resize-start' || mode === 'resize-end') {
                if (clipRef.current) {
                  clipRef.current.releasePointerCapture(e.pointerId);
                }
                isDraggingRef.current = false;
                setIsDragging(false);
                setDraggingClipId(null);
                dragStartDataRef.current = null;
                dragModeRef.current = null;
                setDragMode(null);
              }
            }}
            onDragStart={(e) => {
              if (
                dragModeRef.current !== 'move' &&
                dragModeRef.current !== null
              )
                return;

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
            }}
            onDrag={(e, info) => {
              if (dragModeRef.current !== 'move') return;

              // @ts-ignore - e.altKey exists in drag events
              const altPressed = e.altKey || false;
              isAltPressedRef.current = altPressed;
              setIsCloneMode(altPressed);

              const offsetY = info.offset.y + wheelDeltaRef.current.y;
              const trackIndexDelta = Math.round(offsetY / trackHeight);

              if (trackIndexDelta !== 0) {
                const currentTrackIndex = tracks.findIndex(
                  (t) => t.id === trackId
                );
                const targetTrackIndex = currentTrackIndex + trackIndexDelta;

                if (targetTrackIndex >= 0 && targetTrackIndex < tracks.length) {
                  const targetTrack = tracks[targetTrackIndex];
                  setHoverTrackId(targetTrack.id);
                } else {
                  setHoverTrackId(null);
                }
              } else {
                setHoverTrackId(null);
              }
            }}
            onWheel={(e) => {
              if (isDraggingRef.current && dragModeRef.current === 'move') {
                e.preventDefault();
                wheelDeltaRef.current.x += e.deltaX;
                wheelDeltaRef.current.y += e.deltaY;
              }
            }}
            className={cn(
              'absolute h-full rounded-md overflow-hidden z-5 group',
              'bg-linear-to-b from-cyan-600 to-cyan-700',
              'border border-cyan-500/30',
              'shadow-sm hover:shadow-md transition-shadow',
              {
                'ring-2 ring-white ring-offset-1 ring-offset-neutral-900':
                  isSelected,
                'ring-2 ring-yellow-400 ring-offset-1 ring-offset-neutral-900':
                  isCloneMode && dragMode === 'move',
                'opacity-50': !clip.enabled,
              }
            )}
            onClick={(e) => {
              // 리사이즈 중이면 클릭 무시
              if (
                dragModeRef.current === 'resize-start' ||
                dragModeRef.current === 'resize-end'
              ) {
                return;
              }

              // Set the parent track as active when clicking a clip
              setActiveTrackId(trackId);

              if (e.shiftKey) {
                addSelectedClipId(clip.id);
              } else {
                setSelectedClipId(clip.id);
              }
            }}
            onDragEnd={(_, info) => {
              if (dragModeRef.current !== 'move') {
                dragModeRef.current = null;
                setDragMode(null);
                return;
              }
              const isCloning = isAltPressedRef.current;
              isDraggingRef.current = false;
              setIsDragging(false);
              setDraggingClipId(null);
              setHoverTrackId(null);
              setIsCloneMode(false);

              const totalOffsetX = info.offset.x + wheelDeltaRef.current.x;
              const totalOffsetY = info.offset.y + wheelDeltaRef.current.y;

              const deltaStartTime = (totalOffsetX / pxPerSec) * 1000;
              const newStartTime = Math.max(0, clip.startTime + deltaStartTime);
              const newEndTime = newStartTime + (clip.endTime - clip.startTime);

              console.log('[TimelineClip] Drag end:', {
                isCloning,
                clipId: clip.id,
                originalTime: { start: clip.startTime, end: clip.endTime },
                newTime: { start: newStartTime, end: newEndTime },
              });

              // 트랙 간 이동/복제 로직
              const trackIndexDelta = Math.round(totalOffsetY / trackHeight);

              if (trackIndexDelta !== 0) {
                // 현재 트랙의 인덱스 찾기
                const currentTrackIndex = tracks.findIndex(
                  (t) => t.id === trackId
                );
                const targetTrackIndex = currentTrackIndex + trackIndexDelta;

                // 타겟 트랙이 존재하는 경우 이동/복제
                if (targetTrackIndex >= 0 && targetTrackIndex < tracks.length) {
                  const targetTrack = tracks[targetTrackIndex];

                  if (isCloning) {
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
                  return;
                }

                // 타겟 트랙이 없으면 새로 생성 (중간 빈 트랙 포함)
                if (targetTrackIndex >= tracks.length || targetTrackIndex < 0) {
                  // 현재 트랙의 타입을 확인
                  const currentTrack = tracks[currentTrackIndex];
                  const trackType = currentTrack?.type || 'graphic';

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
                  return;
                }
              }

              // 같은 트랙 내에서 시간만 변경 (복제 모드면 복제)
              if (isCloning) {
                // 같은 트랙에 복제
                cloneClipToTrack(
                  trackId,
                  trackId,
                  clip.id,
                  newStartTime,
                  newEndTime
                );
              } else {
                // 같은 트랙 내에서 시간만 이동
                updateClip(trackId, clip.id, {
                  startTime: newStartTime,
                  endTime: newEndTime,
                });
              }

              // Reset drag mode
              dragModeRef.current = null;
              setDragMode(null);
            }}
          >
            {/* Clip Content */}
            <div className="absolute inset-0 flex flex-col pointer-events-none">
              {/* Top bar with name */}
              <div className="flex items-center gap-1 px-2 py-1 bg-black/20">
                <span className="text-xs font-medium text-white truncate flex-1">
                  {clip.name}
                </span>
                {isLoaded && !isFailed && (
                  <span
                    className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400"
                    title="Synced"
                  />
                )}
                {isFailed && (
                  <span
                    className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400"
                    title="Failed"
                  />
                )}
              </div>
              {/* Content area */}
              <div className="flex-1 px-2 py-0.5 flex items-center justify-between">
                <span className="text-[10px] text-white/60 truncate">
                  {((clip.endTime - clip.startTime) / 1000).toFixed(1)}s
                </span>
                {/* Show trim info for video/audio */}
                {(clip.type === 'video' || clip.type === 'audio') &&
                  (clip.trimStart > 0 || clip.trimEnd > 0) && (
                    <span className="text-[9px] text-yellow-400/70 font-mono">
                      ✂ {(clip.trimStart / 1000).toFixed(1)}-
                      {(clip.trimEnd / 1000).toFixed(1)}
                    </span>
                  )}
              </div>
            </div>

            {/* Resize handles */}
            <div
              className={cn(
                'absolute left-0 top-0 bottom-0 w-2 transition-colors cursor-ew-resize',
                hoverEdge === 'start' || dragMode === 'resize-start'
                  ? 'bg-white/40'
                  : 'bg-white/0 group-hover:bg-white/20'
              )}
            />
            <div
              className={cn(
                'absolute right-0 top-0 bottom-0 w-2 transition-colors cursor-ew-resize',
                hoverEdge === 'end' || dragMode === 'resize-end'
                  ? 'bg-white/40'
                  : 'bg-white/0 group-hover:bg-white/20'
              )}
            />
          </motion.div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={handleCopy}>
            <Copy size={14} />
            <span>Copy</span>
            <ContextMenuShortcut>⌘C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleCut}>
            <Scissors size={14} />
            <span>Cut</span>
            <ContextMenuShortcut>⌘X</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleDuplicate}>
            <Files size={14} />
            <span>Duplicate</span>
            <ContextMenuShortcut>⌘D</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={handleToggleLock}>
            {clip.locked ? <Unlock size={14} /> : <Lock size={14} />}
            <span>{clip.locked ? 'Unlock' : 'Lock'}</span>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleToggleVisibility}>
            {clip.enabled ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{clip.enabled ? 'Hide' : 'Show'}</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onSelect={handleDelete}>
            <Trash2 size={14} />
            <span>Delete</span>
            <ContextMenuShortcut>⌫</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}
