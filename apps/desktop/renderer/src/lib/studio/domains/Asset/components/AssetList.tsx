import type { IAsset } from '@/lib/studio/domains/Asset/types';
import { AssetItem } from '@/lib/studio/domains/Asset/components/AssetItem';
import { FolderOpen } from 'lucide-react';

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
}: AssetsProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header with optional import button */}

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
