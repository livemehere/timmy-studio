import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetRenderer } from './AssetRenderer';

export function VideoAssets() {
  const assets = useDocStore((state) => state.assets);
  const videoAssets = assets.filter((asset) => asset.type === 'video');
  return <AssetRenderer assets={videoAssets} emptyMessage="No video assets" />;
}
