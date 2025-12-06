import { useDocAssets } from '@renderer/lib/studio/hooks';
import { Assets } from './Assets';

export function ImageAssets() {
  const assets = useDocAssets();
  const imageAssets = assets.filter((asset) => asset.type === 'image');
  return <Assets assets={imageAssets} emptyMessage="No image assets" />;
}
