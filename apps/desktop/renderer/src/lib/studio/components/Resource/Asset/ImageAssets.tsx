import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetViewer } from './AssetViewer';

export function ImageAssets() {
  const assets = useDocStore((state) => state.assets);
  const imageAssets = assets.filter((asset) => asset.type === 'image');
  return <AssetViewer assets={imageAssets} emptyMessage="No image assets" />;
}
