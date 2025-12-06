import { useDocAssets } from '@renderer/lib/studio/hooks';
import { Assets } from './Assets';

export function AudioAssets() {
  const assets = useDocAssets();
  const audioAssets = assets.filter((asset) => asset.type === 'audio');
  return <Assets assets={audioAssets} emptyMessage="No audio assets" />;
}
