import { useEffect } from 'react';
import { useDocStore } from '../hooks/useStudioStores';
import type { IAsset } from '../domains/Asset/types';

export function AssetUpdater() {
  const updateAsset = useDocStore((state) => state.updateAsset);
  useEffect(() => {
    return window.app.on('asset:update', (asset: IAsset) => {
      updateAsset(asset.id, asset);
      console.log('Asset updated from main process:', asset);
    });
  }, [updateAsset]);
  return null;
}
