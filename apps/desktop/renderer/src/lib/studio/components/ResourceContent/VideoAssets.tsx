import { useDocAssets } from '@renderer/lib/studio/hooks';
import { Assets } from './Assets';

export function VideoAssets() {
  const assets = useDocAssets();
  const videoAssets = assets.filter((asset) => asset.type === 'video');
  return <Assets assets={videoAssets} emptyMessage="No video assets" />;
}
