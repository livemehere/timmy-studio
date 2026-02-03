import { filter } from 'lodash-es';
import { useDocStore } from '../../../../hooks/useStudioStores';
import { AssetList } from '../AssetList';

export function ImageAssets({ searchText }: { searchText?: string }) {
  const assets = useDocStore((state) => state.assets);
  const imageAssets = assets.filter((asset) => asset.type === 'image');

  const filteredAssets = searchText
    ? filter(imageAssets, (asset) =>
        asset.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : imageAssets;

  return (
    <AssetList assets={filteredAssets} emptyMessage="No images" showImport />
  );
}
