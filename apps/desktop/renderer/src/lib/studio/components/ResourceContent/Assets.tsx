import { formatTime } from '@renderer/lib/studio/utils/time';
import { cn } from '@renderer/utils/cn';
import { formatFileSize } from '@renderer/lib/studio/utils/size';
import type { IAsset, IAssetMetadata } from '@renderer/lib/studio/types/asset';

const badgeClass =
  'absolute text-[9px] bg-black/60 px-1 py-0.5 rounded leading-none select-none';

function MetadataOverlay({ metadata }: { metadata: IAssetMetadata }) {
  return (
    <>
      {/* 좌상단: FPS */}
      {metadata.frameRate != null && (
        <span className={cn(badgeClass, 'top-1 left-1')}>
          {metadata.frameRate}FPS
        </span>
      )}
      {/* 우상단: Duration */}
      {metadata.durationMs != null && (
        <span className={cn(badgeClass, 'top-1 right-1')}>
          {formatTime(metadata.durationMs, { style: 'short', unit: 'ms' })}
        </span>
      )}
      {/* 우하단: Resolution */}
      {metadata.width != null && metadata.height != null && (
        <span className={cn(badgeClass, 'bottom-1 right-1')}>
          {metadata.width}x{metadata.height}
        </span>
      )}
      {/* 좌하단: File size */}
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
        <video
          src={asset.proxyFilePath || asset.filePath}
          className="w-full h-full object-fit"
          muted
        />
      );
    case 'image':
      return (
        <img
          src={asset.filePath}
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
  return (
    <div className="flex flex-col gap-1">
      <div className="h-[70px] bg-neutral-800 rounded overflow-hidden">
        <AssetPreview asset={asset} />
      </div>
      <div className="text-xs text-neutral-500">{asset.name}</div>
    </div>
  );
}

interface AssetsProps {
  assets: IAsset[];
  emptyMessage?: string;
}

export function Assets({ assets, emptyMessage = 'No assets' }: AssetsProps) {
  if (assets.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center text-neutral-500 text-sm select-none">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-y-auto grid auto-cols-[120px] gap-2">
      {assets.map((asset) => (
        <AssetItem key={asset.id} asset={asset} />
      ))}
    </div>
  );
}
