import { useDocAssets } from '@renderer/lib/studio/hooks';
import { AssetRenderer } from './AssetRenderer';

export function VideoAssets() {
  const assets = useDocAssets();
  const videoAssets = assets.filter((asset) => asset.type === 'video');
  return <AssetRenderer assets={videoAssets} emptyMessage="No video assets" />;
}
