import type { IAsset, IAssetMetadata } from '@renderer/lib/studio/types/asset';
import { cn } from '@renderer/utils/cn';
import { formatTime } from '@renderer/lib/studio/utils/time';
import { toFilePath } from '@renderer/lib/studio/utils/toFilePath';
import { useDocStore } from '@renderer/lib/studio/hooks/useStudioStores';
import { useAsset } from '@renderer/lib/studio/hooks/asset/useAsset';
import { Layers, Plus } from 'lucide-react';
import { formatFileSize } from '@renderer/lib/studio/utils/size';
import { Spinner } from '@renderer/components/UI/Spinner';

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
      좌하단: File size
      <span className={cn(badgeClass, 'bottom-1 left-1')}>
        {formatFileSize(metadata.size)}
      </span>
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

export function AssetItem({ asset }: { asset: IAsset }) {
  const tracks = useDocStore((state) => state.tracks);
  const { createToClip, status } = useAsset(asset);

  const getDefaultTrackId = () => {
    const targetType = asset.type === 'audio' ? 'audio' : 'video';
    return tracks.find((t) => t.type === targetType)?.id;
  };

  return (
    <div className="flex flex-col gap-1">
      <div
        className={
          'group h-[70px] bg-neutral-800 rounded overflow-hidden relative'
        }
      >
        <AssetPreviewContent asset={asset} />
        <MetadataOverlay metadata={asset.metadata} />
        {!status.isReady && (
          <div className="absolute inset-0 bg-black/40 flex justify-center items-center">
            <Spinner strokeWidth={2} size={14} />
          </div>
        )}
        <button
          className="absolute bottom-2.5 right-10 bg-[dodgerblue] rounded-full p-1 group-hover:block hidden cursor-pointer"
          onClick={async () => {
            await createToClip({
              placementPresetKey: 'containCenter',
            });
          }}
          title="새 트랙에 추가"
        >
          <Layers className=" text-white" size={14} />
        </button>

        <button
          className="absolute bottom-2.5 right-2.5 bg-[dodgerblue] rounded-full p-1 group-hover:block hidden cursor-pointer"
          onClick={async () => {
            await createToClip({
              trackId: getDefaultTrackId(),
              placementPresetKey: 'containCenter',
            });
          }}
          title="추가"
        >
          <Plus className=" text-white" size={14} />
        </button>
      </div>
      <div className="text-xs text-neutral-500">{asset.name}</div>
    </div>
  );
}
