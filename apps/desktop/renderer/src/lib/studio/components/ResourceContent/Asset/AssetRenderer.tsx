import { formatTime } from '@renderer/lib/studio/utils/time';
import { cn } from '@renderer/utils/cn';
// import { formatFileSize } from '@renderer/lib/studio/utils/size';
import type { IAsset, IAssetMetadata } from '@renderer/lib/studio/types/asset';
import { toFilePath } from '@renderer/lib/studio/utils/toFilePath';
import { Plus } from 'lucide-react';
import { useDocStore } from '../../../hooks/useStudioStores';
import {
  createEmptyAudioTrack,
  createEmptyVideoTrack,
} from '@renderer/lib/studio/utils/track';
import { createClip } from '@renderer/lib/studio/utils/clip';
import type { IClip } from '@renderer/lib/studio/types/types';

const badgeClass =
  'absolute text-[9px] bg-black/60 px-1 py-0.5 rounded leading-none select-none';

function MetadataOverlay({ metadata }: { metadata: IAssetMetadata }) {
  return (
    <>
      {/* 좌상단: FPS */}
      {/*{metadata.frameRate != null && (*/}
      {/*  <span className={cn(badgeClass, 'top-1 left-1')}>*/}
      {/*    {metadata.frameRate}FPS*/}
      {/*  </span>*/}
      {/*)}*/}
      {/* 우상단: Duration */}
      {metadata.durationMs != null && (
        <span className={cn(badgeClass, 'top-1 right-1')}>
          {formatTime(metadata.durationMs, { style: 'short', unit: 'ms' })}
        </span>
      )}
      {/* 우하단: Resolution */}
      {/*{metadata.width != null && metadata.height != null && (*/}
      {/*  <span className={cn(badgeClass, 'bottom-1 right-1')}>*/}
      {/*    {metadata.width}x{metadata.height}*/}
      {/*  </span>*/}
      {/*)}*/}
      {/* 좌하단: File size */}
      {/*<span className={cn(badgeClass, 'bottom-1 left-1')}>*/}
      {/*  {formatFileSize(metadata.size)}*/}
      {/*</span>*/}
    </>
  );
}

function AssetPreviewContent({ asset }: { asset: IAsset }) {
  switch (asset.type) {
    case 'video':
      return (
        <img
          src={toFilePath(asset.thumbnailPath!)}
          className="w-full h-full object-cover rounded"
        />
      );
    case 'image':
      return (
        <img
          src={toFilePath(asset.filePath)}
          alt={asset.name}
          className="w-full h-full object-cover rounded"
        />
      );
    default:
      return (
        <div className="w-full h-full flex justify-center items-center text-neutral-500">
          No Preview
        </div>
      );
  }
}

function AssetPreview({ asset }: { asset: IAsset }) {
  return (
    <div className="relative w-full h-full">
      <AssetPreviewContent asset={asset} />
      <MetadataOverlay metadata={asset.metadata} />
    </div>
  );
}

function AssetItem({ asset }: { asset: IAsset }) {
  const tracks = useDocStore((state) => state.tracks);
  const addTrack = useDocStore((state) => state.addTrack);
  const updateTrack = useDocStore((state) => state.updateTrack);

  const handleAddClip = async () => {
    const { type: assetType, name, id: assetId, metadata } = asset;
    const durationMs = metadata.durationMs || 3000;
    const trackType = assetType === 'audio' ? 'audio' : 'video';

    // 트랙 찾거나 생성
    let track = tracks.find((t) => t.type === trackType);
    if (!track) {
      const existingCount = tracks.filter((t) => t.type === trackType).length;
      track =
        trackType === 'video'
          ? createEmptyVideoTrack(`videoTrack-${existingCount}`, existingCount)
          : createEmptyAudioTrack(`audioTrack-${existingCount}`, existingCount);
      addTrack(track);
    }

    // 클립 생성 및 추가
    const startTime =
      track.clips.length > 0
        ? Math.max(...track.clips.map((c) => c.endTime))
        : 0;
    const endTime = startTime + durationMs;

    let newClip: IClip;
    if (assetType === 'video') {
      newClip = createClip({
        type: 'video',
        name,
        assetId,
        startTime,
        endTime,
        width: metadata.width,
        height: metadata.height,
        trimStart: 0,
        trimEnd: durationMs,
      });
    } else if (assetType === 'image') {
      newClip = createClip({
        type: 'image',
        name,
        assetId,
        startTime,
        endTime,
        width: metadata.width,
        height: metadata.height,
      });
    } else {
      newClip = createClip({
        type: 'audio',
        name,
        assetId,
        startTime,
        endTime,
        trimStart: 0,
        trimEnd: durationMs,
      });
    }

    updateTrack(track.id, {
      clips: [...track.clips, newClip] as any,
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="group h-[70px] bg-neutral-800 rounded overflow-hidden relative">
        <AssetPreview asset={asset} />
        <button
          className="absolute bottom-2.5 right-2.5 bg-[dodgerblue] rounded-full p-1 group-hover:block hidden cursor-pointer"
          onClick={handleAddClip}
        >
          <Plus className=" text-white" size={14} />
        </button>
      </div>
      <div className="text-xs text-neutral-500">{asset.name}</div>
    </div>
  );
}

interface AssetsProps {
  assets: IAsset[];
  emptyMessage?: string;
}

export function AssetRenderer({
  assets,
  emptyMessage = 'No assets',
}: AssetsProps) {
  if (assets.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center text-neutral-500 text-sm select-none">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
      {assets.map((asset) => (
        <AssetItem key={asset.id} asset={asset} />
      ))}
    </div>
  );
}
