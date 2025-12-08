import { useDocAssets } from '@renderer/lib/studio/hooks';
import { AssetRenderer } from './AssetRenderer';

export function AudioAssets() {
  const assets = useDocAssets();
  const audioAssets = assets.filter((asset) => asset.type === 'audio');
  return <AssetRenderer assets={audioAssets} emptyMessage="No audio assets" />;
}
