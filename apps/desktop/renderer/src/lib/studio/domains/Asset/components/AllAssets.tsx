import { filter } from 'lodash-es';
import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetList } from './AssetList';

export function AllAssets({ searchText }: { searchText?: string }) {
  const assets = useDocStore((state) => state.assets);

  const filteredAssets = searchText
    ? filter(assets, (asset) =>
        asset.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : assets;

  return (
    <AssetList
      assets={filteredAssets}
      emptyMessage="No assets yet"
      showImport
    />
  );
}
