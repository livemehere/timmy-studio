import { motion } from 'motion/react';
import {
  useDocStore,
  useEngineStore,
  useInteractionStore,
} from '../../hooks/useStudioStores';
import { msToSec } from '../../utils/time';
import type { IGraphicClip } from '@renderer/lib/studio/domains/Clip/types';
import { cn } from '@renderer/utils/cn';

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
  const tracks = useDocStore((state) => state.tracks);
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

  return (
    <motion.div
      style={{
        width,
        left,
      }}
      drag
      dragMomentum={false}
      dragSnapToOrigin
      dragElastic={0}
      onDragStart={() => {
        setDraggingClipId(clip.id);
      }}
      onDrag={(_, info) => {
        const offsetY = info.offset.y;
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
      className={cn(
        'absolute h-full bg-cyan-700 px-2 py-1 rounded overflow-hidden z-1',
        { 'border-1 border-white': isSelected }
      )}
      onClick={(e) => {
        if (e.shiftKey) {
          addSelectedClipId(clip.id);
        } else {
          setSelectedClipId(clip.id);
        }
      }}
      onDragEnd={(_, info) => {
        setDraggingClipId(null);
        setHoverTrackId(null);

        const deltaStartTime = (info.offset.x / pxPerSec) * 1000;
        const newStartTime = Math.max(0, clip.startTime + deltaStartTime);
        const newEndTime = newStartTime + (clip.endTime - clip.startTime);

        // 트랙 간 이동 로직
        const offsetY = info.offset.y;
        const trackIndexDelta = Math.round(offsetY / trackHeight);

        if (trackIndexDelta !== 0) {
          // 현재 트랙의 인덱스 찾기
          const currentTrackIndex = tracks.findIndex((t) => t.id === trackId);
          const targetTrackIndex = currentTrackIndex + trackIndexDelta;

          // 타겟 트랙이 존재하는 경우에만 이동
          if (targetTrackIndex >= 0 && targetTrackIndex < tracks.length) {
            const targetTrack = tracks[targetTrackIndex];
            moveClipToTrack(trackId, targetTrack.id, clip.id);
            // 타겟 트랙에서 시간 업데이트
            updateClip(targetTrack.id, clip.id, {
              startTime: newStartTime,
              endTime: newEndTime,
            });
            return;
          }
        }

        // 같은 트랙 내에서 시간만 변경
        updateClip(trackId, clip.id, {
          startTime: newStartTime,
          endTime: newEndTime,
        });
      }}
    >
      {clip.name}
      {isLoaded && <span className="ml-1 text-xs opacity-70">(loaded)</span>}
    </motion.div>
  );
}
