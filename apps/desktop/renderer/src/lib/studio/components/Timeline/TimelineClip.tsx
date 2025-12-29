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
}: {
  clipId: string;
  pxPerSec: number;
  trackId: string;
}) {
  const getClipById = useDocStore((state) => state.getClipById);
  const updateClip = useDocStore((state) => state.updateClip);
  const clip = getClipById<IGraphicClip>(trackId, clipId)!;

  const syncedClipIds = useEngineStore((state) => state.syncedVideoClipIds);
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
      className={cn(
        'absolute h-full bg-cyan-700 px-2 py-1 rounded overflow-hidden',
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
        const deltaStartTime = (info.offset.x / pxPerSec) * 1000;
        const newStartTime = Math.max(0, clip.startTime + deltaStartTime);
        const newEndTime = newStartTime + (clip.endTime - clip.startTime);
        updateClip(trackId, clip.id, {
          startTime: newStartTime,
          endTime: newEndTime,
        });
        // TODO: y 값이 트랙의 높이 절반을 넘어가면, 해당 위치의 트랙으로 옮기기. (만약 트랙이 없으면 새로 만들어서 그 트랙으로 옮기기)
      }}
    >
      {clip.name}
      {isLoaded && <span className="ml-1 text-xs opacity-70">(loaded)</span>}
    </motion.div>
  );
}
