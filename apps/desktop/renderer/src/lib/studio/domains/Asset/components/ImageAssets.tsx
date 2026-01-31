import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetList } from './AssetList';

export function ImageAssets() {
  const assets = useDocStore((state) => state.assets);
  const imageAssets = assets.filter((asset) => asset.type === 'image');
  return <AssetList assets={imageAssets} emptyMessage="No images" showImport />;
}
