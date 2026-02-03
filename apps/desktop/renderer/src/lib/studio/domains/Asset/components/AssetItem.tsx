import type { AssetStatus, IAsset } from '@/lib/studio/domains/Asset/types';
import { Asset } from '@/lib/studio/domains/Asset/Asset';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/studio/utils/time';
import { toFilePath } from '@/lib/studio/utils/toFilePath';
import {
  Plus,
  Film,
  ImageIcon,
  Music,
  FileIcon,
  Square,
  Type,
} from 'lucide-react';
import { formatFileSize } from '@/lib/studio/utils/size';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { motion } from 'motion/react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Trash2 } from 'lucide-react';

export interface AssetItemProps {
  asset: IAsset;
  onAddToTrack: (
    asset: IAsset,
    options: { position: 'currentTime' | 'endOfTrack' }
  ) => void;
  onDelete: (asset: IAsset) => void;
}

export function AssetItem({ asset, onAddToTrack, onDelete }: AssetItemProps) {
  const status = Asset.getStatus(asset);

  const isDisabled =
    Asset.isMediaAsset(asset) && (status.isError || !status.isReady);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          layoutId={asset.id}
          className="flex flex-col gap-1 group/asset"
        >
          <AssetPreview
            asset={asset}
            onAddToTrack={onAddToTrack}
            isDisabled={isDisabled}
            status={status}
          />
          <p className="whitespace-pre truncate text-xs">{asset.name}</p>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem variant="destructive" onClick={() => onDelete(asset)}>
          <Trash2 />
          Delete
        </ContextMenuItem>

        {Asset.hasMetadata(asset) && (
          <>
            <ContextMenuSeparator />
            <ContextMenuLabel>Info</ContextMenuLabel>
            {asset.metadata.size != null && (
              <ContextMenuItem disabled>
                Size: {formatFileSize(asset.metadata.size)}
              </ContextMenuItem>
            )}
            {asset.metadata.durationMs != null && (
              <ContextMenuItem disabled>
                Duration:{' '}
                {formatTime(asset.metadata.durationMs, {
                  style: 'short',
                  unit: 'ms',
                })}
              </ContextMenuItem>
            )}
            {asset.metadata.width != null && asset.metadata.height != null && (
              <ContextMenuItem disabled>
                Resolution: {asset.metadata.width} × {asset.metadata.height}
              </ContextMenuItem>
            )}
            {asset.metadata.frameRate != null && (
              <ContextMenuItem disabled>
                FPS: {asset.metadata.frameRate} fps
              </ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

interface AssetPreviewProps {
  asset: IAsset;
  onAddToTrack: (
    asset: IAsset,
    options: { position: 'currentTime' | 'endOfTrack' }
  ) => void;
  isDisabled: boolean;
  status: AssetStatus;
}

function AssetPreview({
  asset,
  onAddToTrack,
  isDisabled,
  status,
}: AssetPreviewProps) {
  const getTypeIcon = () => {
    switch (asset.type) {
      case 'video':
        return <Film className="h-3 w-3" />;
      case 'image':
        return <ImageIcon className="h-3 w-3" />;
      case 'audio':
        return <Music className="h-3 w-3" />;
      case 'shape':
        return <Square className="h-3 w-3" />;
      case 'text':
        return <Type className="h-3 w-3" />;
      default:
        return <FileIcon className="h-3 w-3" />;
    }
  };

  return (
    <div className="relative aspect-video bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700/50 transition-all hover:border-neutral-600">
      <AssetPreviewContent asset={asset} />

      {/* Type Badge */}
      <Badge
        variant="outline"
        className="absolute top-1 left-1 h-4 px-1 text-[9px] gap-0.5 bg-black/60 border-transparent"
      >
        {getTypeIcon()}
      </Badge>

      {/* Duration Badge */}
      {Asset.hasMetadata(asset) && asset.metadata.durationMs != null && (
        <span className="absolute top-1 right-1 text-[9px] bg-black/60 px-1 py-0.5 rounded leading-none text-white">
          {formatTime(asset.metadata.durationMs, {
            style: 'short',
            unit: 'ms',
          })}
        </span>
      )}

      {/* Loading Overlay */}
      {Asset.isMediaAsset(asset) && !status.isReady && !status.isError && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center">
          <Spinner />
        </div>
      )}

      {/* Error Overlay */}
      {Asset.isMediaAsset(asset) && status.isError && (
        <div className="absolute inset-0 bg-red-900/70 flex flex-col justify-center items-center gap-1">
          <span className="text-red-200 text-[10px] font-bold">ERROR</span>
        </div>
      )}

      {/* Action Buttons - show on hover */}
      <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover/asset:opacity-100 transition-opacity">
        <button
          className={cn(
            'bg-emerald-600 hover:bg-emerald-500 rounded-full p-1.5 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          disabled={isDisabled}
          onClick={() => {
            onAddToTrack(asset, { position: 'currentTime' });
          }}
        >
          <Plus className="text-white h-3 w-3" />
        </button>
      </div>

      {/* Duration Badge - Bottom Left */}
      {Asset.hasMetadata(asset) && asset.metadata.durationMs != null && (
        <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 px-1 py-0.5 rounded leading-none text-neutral-300">
          {formatTime(asset.metadata.durationMs, {
            style: 'short',
            unit: 'ms',
          })}
        </span>
      )}
    </div>
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
    case 'shape':
      return (
        <div className="w-full h-full flex justify-center items-center bg-linear-to-br from-blue-900/30 to-neutral-900">
          <Square className="h-8 w-8 text-blue-400/50" />
        </div>
      );
    case 'text':
      return (
        <div className="w-full h-full flex justify-center items-center bg-linear-to-br from-indigo-900/30 to-neutral-900">
          <Type className="h-8 w-8 text-indigo-400/50" />
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
