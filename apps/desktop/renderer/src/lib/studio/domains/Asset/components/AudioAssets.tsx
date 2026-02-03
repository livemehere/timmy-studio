import { filter } from 'lodash-es';
import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetList } from './AssetList';

export function AudioAssets({ searchText }: { searchText?: string }) {
  const assets = useDocStore((state) => state.assets);
  const audioAssets = assets.filter((asset) => asset.type === 'audio');

  const filteredAssets = searchText
    ? filter(audioAssets, (asset) =>
        asset.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : audioAssets;

  return (
    <AssetList
      assets={filteredAssets}
      emptyMessage="No audio files"
      showImport
    />
  );
}
