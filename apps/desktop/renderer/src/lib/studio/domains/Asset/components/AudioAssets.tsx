import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetList } from './AssetList';

export function AudioAssets() {
  const assets = useDocStore((state) => state.assets);
  const audioAssets = assets.filter((asset) => asset.type === 'audio');
  return <AssetList assets={audioAssets} emptyMessage="No audio assets" />;
}
