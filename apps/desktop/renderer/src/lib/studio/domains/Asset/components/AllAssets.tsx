import { useDocStore } from '../../../hooks/useStudioStores';
import { useSelectAssets } from '@/lib/studio/domains/Asset/hooks/useSelectAssets';
import { AssetList } from './AssetList';

export function AllAssets() {
  const assets = useDocStore((state) => state.assets);
  const handleSelectFiles = useSelectAssets();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button
          className="text-xs bg-neutral-700 rounded px-2 py-0.5 hover:bg-neutral-600 cursor-pointer"
          onClick={handleSelectFiles}
        >
          가져오기
        </button>
      </div>
      <AssetList assets={assets} emptyMessage="No assets" />
    </div>
  );
}
