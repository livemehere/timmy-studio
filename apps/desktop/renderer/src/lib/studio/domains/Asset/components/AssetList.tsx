import type { IAsset } from '@/lib/studio/domains/Asset/types';
import { AssetItem } from '@/lib/studio/domains/Asset/components/AssetItem';
import { Button } from '@/components/ui/button';
import { Upload, FolderOpen } from 'lucide-react';
import { useSelectAssets } from '@/lib/studio/domains/Asset/hooks/useSelectAssets';

interface AssetsProps {
  assets: IAsset[];
  emptyMessage?: string;
  showImport?: boolean;
  title?: string;
}

export function AssetList({
  assets,
  emptyMessage = 'No assets',
  showImport = false,
  title,
}: AssetsProps) {
  const handleSelectFiles = useSelectAssets();

  return (
    <div className="flex flex-col h-full">
      {/* Header with optional import button */}
      {(showImport || title) && (
        <div className="shrink-0 flex items-center justify-between pb-3">
          {title && (
            <span className="text-xs font-medium text-neutral-400">
              {title}
            </span>
          )}
          {showImport && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={handleSelectFiles}
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      {assets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-neutral-500">
          <div className="w-12 h-12 rounded-xl bg-neutral-800/50 flex items-center justify-center">
            <FolderOpen className="h-6 w-6 text-neutral-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-400">
              {emptyMessage}
            </p>
            {showImport && (
              <p className="text-xs text-neutral-500 mt-1">
                Click Import to add files
              </p>
            )}
          </div>
          {showImport && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5"
              onClick={handleSelectFiles}
            >
              <Upload className="h-3.5 w-3.5" />
              Import Files
            </Button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 content-start">
          {assets.map((asset) => (
            <AssetItem key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}
