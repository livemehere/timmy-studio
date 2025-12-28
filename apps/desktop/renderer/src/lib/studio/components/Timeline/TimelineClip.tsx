import {
  useDocStore,
  useEngineStore,
  useInteractionStore,
} from '../../hooks/useStudioStores';
import { msToSec } from '../../utils/time';
import type { IGraphicClip } from '@renderer/lib/studio/domains/Clip/types';

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
  const clip = getClipById<IGraphicClip>(trackId, clipId);

  if (!clip) {
    throw new Error(`Clip(${clipId}) not found`);
  }

  const syncedClipIds = useEngineStore((state) => state.syncedVideoClipIds);
  const isLoaded = syncedClipIds.includes(clipId);

  const width = msToSec(clip.endTime - clip.startTime) * pxPerSec;
  const left = msToSec(clip.startTime) * pxPerSec;

  const setSelectedClipId = useInteractionStore(
    (state) => state.setSelectedClipId
  );

  const addSelectedClipId = useInteractionStore(
    (state) => state.addSelectedClipId
  );

  return (
    <div
      style={{
        width,
        left,
      }}
      className="absolute h-full bg-cyan-700 px-2 py-1 rounded overflow-hidden"
      onClick={(e) => {
        if (e.shiftKey) {
          addSelectedClipId(clip.id);
        } else {
          setSelectedClipId(clip.id);
        }
      }}
    >
      {clip.name}
      {isLoaded && <span className="ml-1 text-xs opacity-70">(loaded)</span>}
    </div>
  );
}
