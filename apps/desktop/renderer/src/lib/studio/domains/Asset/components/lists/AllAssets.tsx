import { filter } from 'lodash-es';
import { useDocStore } from '../../../../hooks/useStudioStores';
import { AssetList } from '../AssetList';
import { isIncludeSubStr } from '@/utils/string';

export function AllAssets({ searchText }: { searchText?: string }) {
  const assets = useDocStore((state) => state.assets);

  const filteredAssets = searchText
    ? filter(assets, (asset) => isIncludeSubStr(asset.name, searchText))
    : assets;

  return (
    <AssetList assets={filteredAssets} emptyMessage="No assets" showImport />
  );
}
