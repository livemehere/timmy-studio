import {
  useDocStore,
  useEngineStore,
  useInteractionStore,
} from '../../hooks/useStudioStores';
import type { IVideoClip } from '../../types/types';
import { msToSec } from '../../utils/time';
import { toFilePath } from '../../utils/toFilePath';

export function TimelineItem({
  clipId,
  pxPerSec,
  trackId,
}: {
  clipId: string;
  pxPerSec: number;
  trackId: string;
}) {
  const getClipById = useDocStore((state) => state.getClipById);
  const clip = getClipById<IVideoClip>(trackId, clipId);

  const getAssetById = useDocStore((state) => state.getAssetById);

  if (!clip) {
    throw new Error(`Clip(${clipId}) not found`);
  }

  const asset =
    clip.type === 'video' || clip.type === 'image'
      ? getAssetById(clip.assetId)
      : undefined;

  const syncedClipIds = useEngineStore((state) => state.syncedVideoClipIds);
  const isLoaded = syncedClipIds.includes(clipId);

  const width = msToSec(clip.endTime - clip.startTime) * pxPerSec;
  const left = msToSec(clip.startTime) * pxPerSec;

  const filmstrip =
    asset?.type === 'video' && asset.isFilmstripReady
      ? asset.filmstrip
      : undefined;

  const clipDurationMs = clip.endTime - clip.startTime;
  const trimStartMs = clip.type === 'video' ? (clip.trimStart ?? 0) : 0;
  const trimEndMs =
    clip.type === 'video' ? (clip.trimEnd ?? trimStartMs + clipDurationMs) : 0;
  const trimmedDurationMs = Math.max(1, trimEndMs - trimStartMs);

  const filmstripStyle =
    filmstrip && width > 0
      ? (() => {
          const assetDurationMs =
            filmstrip.assetDurationMs ?? asset?.metadata.durationMs;

          if (!assetDurationMs || assetDurationMs <= 0) return undefined;

          const bgWidthPx = (assetDurationMs / trimmedDurationMs) * width;
          const bgPosXPx = -(trimStartMs / assetDurationMs) * bgWidthPx;

          return {
            backgroundImage: `url("${toFilePath(filmstrip.filePath)}")`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${bgWidthPx}px 100%`,
            backgroundPosition: `${bgPosXPx}px center`,
          } as const;
        })()
      : undefined;

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
        ...(filmstripStyle ?? {}),
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
