import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetList } from './AssetList';

export function VideoAssets() {
  const assets = useDocStore((state) => state.assets);
  const videoAssets = assets.filter((asset) => asset.type === 'video');
  return <AssetList assets={videoAssets} emptyMessage="No video assets" />;
}
