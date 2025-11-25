import { useEffect } from 'react';
import {
  useClip,
  useClipSprite,
  useRendererReady,
} from '@renderer/lib/studio/contexts/StudioProvider';
import type { IVideoClip } from '../../types';

export function Clip({ clipId }: { clipId: string }) {
  const clip = useClip<IVideoClip>(clipId);
  const isRendererReady = useRendererReady();
  const sprite = useClipSprite(clipId);

  useEffect(() => {
    if (isRendererReady && sprite) {
      console.debug(`[Clip] Sprite loaded for clip: ${clipId}`, {
        label: sprite.label,
        x: sprite.x,
        y: sprite.y,
        width: sprite.width,
        height: sprite.height,
        alpha: sprite.alpha,
      });
    }
  }, [clipId, isRendererReady, sprite]);

  if (!clip) {
    throw new Error(`Clip(${clipId}) not found`);
  }

  return (
    <div className="inline-block h-full bg-cyan-700 px-2 py-1 rounded">
      {clip.name}
      {sprite && <span className="ml-1 text-xs opacity-70">(loaded)</span>}
      <input
        type="number"
        defaultValue={clip.transforms.position!.x}
        onChange={(e) => {
          if (sprite) {
            sprite.x = Number(e.target.value);
          }
        }}
      />
    </div>
  );
}
