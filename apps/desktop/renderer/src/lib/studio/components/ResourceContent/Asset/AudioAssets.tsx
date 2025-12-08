import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetRenderer } from './AssetRenderer';

export function AudioAssets() {
  const assets = useDocStore((state) => state.assets);
  const audioAssets = assets.filter((asset) => asset.type === 'audio');
  return <AssetRenderer assets={audioAssets} emptyMessage="No audio assets" />;
}
