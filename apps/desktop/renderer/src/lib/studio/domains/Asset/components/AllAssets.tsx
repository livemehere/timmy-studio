import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetList } from './AssetList';

export function AllAssets() {
  const assets = useDocStore((state) => state.assets);

  return <AssetList assets={assets} emptyMessage="No assets yet" showImport />;
}
