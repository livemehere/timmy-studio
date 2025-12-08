import { useDocAssets } from '@renderer/lib/studio/hooks';
import { AssetRenderer } from './AssetRenderer';

export function ImageAssets() {
  const assets = useDocAssets();
  const imageAssets = assets.filter((asset) => asset.type === 'image');
  return <AssetRenderer assets={imageAssets} emptyMessage="No image assets" />;
}
