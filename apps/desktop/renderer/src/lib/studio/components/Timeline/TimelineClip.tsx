import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import {
  useDocStore,
  useEngineStore,
  useInteractionStore,
} from '../../hooks/useStudioStores';
import { msToSec } from '../../utils/time';
import type { IGraphicClip } from '@renderer/lib/studio/domains/Clip/types';
import { cn } from '@renderer/utils/cn';
import { Track } from '@renderer/lib/studio/domains/Track/Track';

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
  const updateClip = useDocStore((state) => state.updateClip);
  const moveClipToTrack = useDocStore((state) => state.moveClipToTrack);
  const cloneClipToTrack = useDocStore((state) => state.cloneClipToTrack);
  const addTrack = useDocStore((state) => state.addTrack);
  const tracks = useDocStore((state) => state.tracks);
  const setActiveTrackId = useDocStore((state) => state.setActiveTrackId);
  const clip = getClipById<IGraphicClip>(trackId, clipId)!;

  const syncedClipIds = useEngineStore(
    (state) => state.syncedGraphicClipIds || []
  );
  const isLoaded = syncedClipIds.includes(clipId);

  const width = msToSec(clip.endTime - clip.startTime) * pxPerSec;
  const left = msToSec(clip.startTime) * pxPerSec;

  const isSelected = useInteractionStore((state) =>
    state.selectedClipIds.includes(clip.id)
  );
  const setSelectedClipId = useInteractionStore(
    (state) => state.setSelectedClipId
  );

  const addSelectedClipId = useInteractionStore(
    (state) => state.addSelectedClipId
  );
  const setDraggingClipId = useInteractionStore(
    (state) => state.setDraggingClipId
  );
  const setHoverTrackId = useInteractionStore((state) => state.setHoverTrackId);

  const wheelDeltaRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const isAltPressedRef = useRef(false);
  const [isCloneMode, setIsCloneMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <>
      {/* Ghost Element: Alt 키로 복제 중일 때 원본 위치에 표시 */}
      {isCloneMode && isDragging && (
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

      <motion.div
        data-clip-id={clip.id}
        style={{
          width,
          left,
        }}
        drag
        dragMomentum={false}
        dragSnapToOrigin
        dragElastic={0}
        onDragStart={(e) => {
          setDraggingClipId(clip.id);
          isDraggingRef.current = true;
          setIsDragging(true);
          wheelDeltaRef.current = { x: 0, y: 0 };
          // @ts-ignore - e.altKey exists in drag events
          const altPressed = e.altKey || false;
          isAltPressedRef.current = altPressed;
          setIsCloneMode(altPressed);
        }}
        onDrag={(e, info) => {
          // @ts-ignore - e.altKey exists in drag events
          const altPressed = e.altKey || false;
          isAltPressedRef.current = altPressed;
          setIsCloneMode(altPressed);

          const offsetY = info.offset.y + wheelDeltaRef.current.y;
          const trackIndexDelta = Math.round(offsetY / trackHeight);

          if (trackIndexDelta !== 0) {
            const currentTrackIndex = tracks.findIndex((t) => t.id === trackId);
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
          if (isDraggingRef.current) {
            e.preventDefault();
            wheelDeltaRef.current.x += e.deltaX;
            wheelDeltaRef.current.y += e.deltaY;
          }
        }}
        className={cn(
          'absolute h-full bg-cyan-700 px-2 py-1 rounded overflow-hidden z-5',
          {
            'border-1 border-white': isSelected,
            'ring-2 ring-yellow-400': isCloneMode,
          }
        )}
        onClick={(e) => {
          // Set the parent track as active when clicking a clip
          setActiveTrackId(trackId);

          if (e.shiftKey) {
            addSelectedClipId(clip.id);
          } else {
            setSelectedClipId(clip.id);
          }
        }}
        onDragEnd={(_, info) => {
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
            const currentTrackIndex = tracks.findIndex((t) => t.id === trackId);
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
        }}
      >
        {clip.name}
        {isLoaded && <span className="ml-1 text-xs opacity-70">(loaded)</span>}
      </motion.div>
    </>
  );
}
