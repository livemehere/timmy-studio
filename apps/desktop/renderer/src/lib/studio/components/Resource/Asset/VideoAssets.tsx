import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetViewer } from './AssetViewer';

export function VideoAssets() {
  const assets = useDocStore((state) => state.assets);
  const videoAssets = assets.filter((asset) => asset.type === 'video');
  return <AssetViewer assets={videoAssets} emptyMessage="No video assets" />;
}
