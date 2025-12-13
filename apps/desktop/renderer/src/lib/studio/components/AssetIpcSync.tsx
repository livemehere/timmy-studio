import { useEffect } from 'react';
import type { IAsset } from '@renderer/lib/studio/types/asset';
import { useDocStore } from '@renderer/lib/studio/hooks/useStudioStores';

export function AssetIpcSync() {
  const setAsset = useDocStore((state) => state.setAsset);

  useEffect(() => {
    const unsubscribe = window.app.on('updateAsset', (asset: IAsset) => {
      setAsset(asset);
    });

    return () => unsubscribe();
  }, [setAsset]);

  return null;
}
