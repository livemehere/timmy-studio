import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetRenderer } from './AssetRenderer';

export function ImageAssets() {
  const assets = useDocStore((state) => state.assets);
  const imageAssets = assets.filter((asset) => asset.type === 'image');
  return <AssetRenderer assets={imageAssets} emptyMessage="No image assets" />;
}
