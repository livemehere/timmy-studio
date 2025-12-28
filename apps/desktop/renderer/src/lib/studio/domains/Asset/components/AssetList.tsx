import type { IAsset } from '@renderer/lib/studio/domains/Asset/types';

import { AssetItem } from '@renderer/lib/studio/domains/Asset/components/AssetItem';

interface AssetsProps {
  assets: IAsset[];
  emptyMessage?: string;
}

export function AssetList({ assets, emptyMessage = 'No assets' }: AssetsProps) {
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
