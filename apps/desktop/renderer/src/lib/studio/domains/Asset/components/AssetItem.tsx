import type { IAsset, IAssetMetadata } from '@/lib/studio/domains/Asset/types';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/studio/utils/time';
import { toFilePath } from '@/lib/studio/utils/toFilePath';
import { useAsset } from '@/lib/studio/domains/Asset/hooks/useAsset';
import { Layers, Plus, Film, ImageIcon, Music, FileIcon } from 'lucide-react';
import { formatFileSize } from '@/lib/studio/utils/size';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

export function AssetItem({ asset }: { asset: IAsset }) {
  const { addClip, firstTrackId, status } = useAsset(asset);

  const getTypeIcon = () => {
    switch (asset.type) {
      case 'video':
        return <Film className="h-3 w-3" />;
      case 'image':
        return <ImageIcon className="h-3 w-3" />;
      case 'audio':
        return <Music className="h-3 w-3" />;
      default:
        return <FileIcon className="h-3 w-3" />;
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-1 group/asset">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700/50 transition-all hover:border-neutral-600">
          <AssetPreviewContent asset={asset} />

          {/* Type Badge */}
          <Badge
            variant="outline"
            className="absolute top-1 left-1 h-4 px-1 text-[9px] gap-0.5 bg-black/60 border-transparent"
          >
            {getTypeIcon()}
            <span className="uppercase">{asset.type}</span>
          </Badge>

          {/* Duration Badge */}
          {asset.metadata.durationMs != null && (
            <span className="absolute top-1 right-1 text-[9px] bg-black/60 px-1 py-0.5 rounded leading-none text-white">
              {formatTime(asset.metadata.durationMs, {
                style: 'short',
                unit: 'ms',
              })}
            </span>
          )}

          {/* Loading Overlay */}
          {!status.isReady && !status.isError && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center">
              <Spinner />
            </div>
          )}

          {/* Error Overlay */}
          {status.isError && (
            <div className="absolute inset-0 bg-red-900/70 flex flex-col justify-center items-center gap-1">
              <span className="text-red-200 text-[10px] font-bold">ERROR</span>
            </div>
          )}

          {/* Action Buttons - show on hover */}
          <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover/asset:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'bg-blue-600 hover:bg-blue-500 rounded-full p-1.5 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  disabled={status.isError || !status.isReady}
                  onClick={async () => {
                    await addClip({
                      placementPresetKey: 'containCenter',
                    });
                  }}
                >
                  <Layers className="text-white h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Add to new track
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'bg-emerald-600 hover:bg-emerald-500 rounded-full p-1.5 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  disabled={status.isError || !status.isReady}
                  onClick={async () => {
                    await addClip({
                      trackId: firstTrackId,
                      placementPresetKey: 'containCenter',
                    });
                  }}
                >
                  <Plus className="text-white h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Add to current track
              </TooltipContent>
            </Tooltip>
          </div>

          {/* File Size */}
          <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 px-1 py-0.5 rounded leading-none text-neutral-300">
            {formatFileSize(asset.metadata.size)}
          </span>
        </div>

        {/* File Name */}
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-[11px] text-neutral-400 truncate px-0.5 cursor-default">
              {asset.name}
            </p>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-[200px]">
            <p className="break-all">{asset.name}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

function AssetPreviewContent({ asset }: { asset: IAsset }) {
  switch (asset.type) {
    case 'video':
      return (
        <img
          src={toFilePath(asset.thumbnailPath!)}
          className="w-full h-full object-cover"
          alt={asset.name}
          draggable={false}
        />
      );
    case 'image':
      return (
        <img
          src={toFilePath(asset.filePath)}
          alt={asset.name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      );
    case 'audio':
      return (
        <div className="w-full h-full flex justify-center items-center bg-linear-to-br from-purple-900/50 to-neutral-900">
          <Music className="h-8 w-8 text-purple-400/50" />
        </div>
      );
    default:
      return (
        <div className="w-full h-full flex justify-center items-center text-neutral-600">
          <FileIcon className="h-8 w-8" />
        </div>
      );
  }
}
