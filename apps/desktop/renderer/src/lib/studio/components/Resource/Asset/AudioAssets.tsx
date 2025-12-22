import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetViewer } from './AssetViewer';

export function AudioAssets() {
  const assets = useDocStore((state) => state.assets);
  const audioAssets = assets.filter((asset) => asset.type === 'audio');
  return <AssetViewer assets={audioAssets} emptyMessage="No audio assets" />;
}
