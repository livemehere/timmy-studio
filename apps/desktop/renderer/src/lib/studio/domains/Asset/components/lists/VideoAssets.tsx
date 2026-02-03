import { filter } from 'lodash-es';
import { useDocStore } from '../../../../hooks/useStudioStores';
import { AssetList } from '../AssetList';
import { isIncludeSubStr } from '@/utils/string';

export function VideoAssets({ searchText }: { searchText?: string }) {
  const assets = useDocStore((state) => state.assets);
  const videoAssets = assets.filter((asset) => asset.type === 'video');

  const filteredAssets = searchText
    ? filter(videoAssets, (asset) => isIncludeSubStr(asset.name, searchText))
    : videoAssets;

  return (
    <AssetList assets={filteredAssets} emptyMessage="No videos" showImport />
  );
}
