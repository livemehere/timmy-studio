import { useDocStore, useEngineStore } from '../../hooks/useStudioStores';
import type { IVideoClip } from '../../types/types';
import { msToSec } from '../../utils/time';

export function TimelineItem({
  clipId,
  pxPerSec,
}: {
  clipId: string;
  pxPerSec: number;
}) {
  const clip = useDocStore((state) => {
    for (const track of state.tracks) {
      const found = track.clips.find((c) => c.id === clipId);
      if (found) return found as IVideoClip;
    }
    return undefined;
  });

  const renderer = useEngineStore((state) => state.renderer);
  const isReady = useEngineStore((state) => state.isRendererReady);
  const syncedClipIds = useEngineStore((state) => state.syncedVideoClipIds);
  const sprite =
    isReady && renderer && syncedClipIds.includes(clipId)
      ? (renderer.getClipSprite(clipId) ?? null)
      : null;
  const width = clip ? msToSec(clip.endTime - clip.startTime) * pxPerSec : 0;
  const left = clip ? msToSec(clip.startTime) * pxPerSec : 0;

  if (!clip) {
    throw new Error(`Clip(${clipId}) not found`);
  }

  return (
    <div
      style={{
        width,
        left,
      }}
      className="absolute h-full bg-cyan-700 px-2 py-1 rounded"
    >
      {clip.name}
      {sprite && <span className="ml-1 text-xs opacity-70">(loaded)</span>}
      {/* <input
        type="number"
        defaultValue={clip.transforms.position!.x}
        onChange={(e) => {
          if (sprite) {
            sprite.x = Number(e.target.value);
          }
        }}
      /> */}
    </div>
  );
}
