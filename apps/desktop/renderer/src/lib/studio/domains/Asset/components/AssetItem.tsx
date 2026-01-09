import type { IAsset, IAssetMetadata } from '@/lib/studio/domains/Asset/types';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/studio/utils/time';
import { toFilePath } from '@/lib/studio/utils/toFilePath';
import { useAsset } from '@/lib/studio/domains/Asset/hooks/useAsset';
import { Layers, Plus } from 'lucide-react';
import { formatFileSize } from '@/lib/studio/utils/size';
import { Spinner } from '@/components/Spinner';

const badgeClass =
  'absolute text-[9px] bg-black/60 px-1 py-0.5 rounded leading-none select-none';

export function AssetItem({ asset }: { asset: IAsset }) {
  const { addClip, firstTrackId, status } = useAsset(asset);

  return (
    <div className="flex flex-col gap-1">
      <div
        className={
          'group h-[70px] bg-neutral-800 rounded overflow-hidden relative'
        }
      >
        <AssetPreviewContent asset={asset} />
        <MetadataOverlay metadata={asset.metadata} />
        {!status.isReady && !status.isError && (
          <div className="absolute inset-0 bg-black/40 flex justify-center items-center">
            <Spinner strokeWidth={2} size={14} />
          </div>
        )}
        {status.isError && (
          <div className="absolute inset-0 bg-red-900/60 flex justify-center items-center">
            <span className="text-red-200 text-[10px] font-bold">ERROR</span>
          </div>
        )}
        <button
          className="absolute bottom-2.5 right-10 bg-[dodgerblue] rounded-full p-1 group-hover:block hidden cursor-pointer disabled:hidden"
          disabled={status.isError || !status.isReady}
          onClick={async () => {
            await addClip({
              placementPresetKey: 'containCenter',
            });
          }}
          title="새 트랙에 추가"
        >
          <Layers className=" text-white" size={14} />
        </button>

        <button
          className="absolute bottom-2.5 right-2.5 bg-[dodgerblue] rounded-full p-1 group-hover:block hidden cursor-pointer disabled:hidden"
          disabled={status.isError || !status.isReady}
          onClick={async () => {
            await addClip({
              trackId: firstTrackId, // 없으면 새로운 트랙 생성됨
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
          alt={asset.name}
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
