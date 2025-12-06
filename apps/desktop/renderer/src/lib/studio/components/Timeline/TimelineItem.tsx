import { useDocClip, usePixiClipSprite } from '@renderer/lib/studio/hooks';
import type { IVideoClip } from '../../types';
import { msToSec } from '../../utils/time';

export function TimelineItem({
  clipId,
  pxPerSec,
}: {
  clipId: string;
  pxPerSec: number;
}) {
  const clip = useDocClip<IVideoClip>(clipId);
  const sprite = usePixiClipSprite(clipId);
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
