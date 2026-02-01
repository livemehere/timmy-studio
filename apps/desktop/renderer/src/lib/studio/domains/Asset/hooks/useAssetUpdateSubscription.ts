import { useDocStore } from '@/lib/studio/hooks/useStudioStores';
import { useEffect } from 'react';
import type { IAsset } from '@/lib/studio/domains/Asset/types';

/**
 * @description main 프로세스에서 asset 의 비동기 처리가 끝나면 업데이트 이벤트가 오는데, 해당 에셋을 상태 업데이트
 */
export function useAssetUpdateSubscription() {
  const updateAsset = useDocStore((state) => state.updateAsset);
  useEffect(() => {
    const unsubscribe = window.app.on('asset:update', (asset: IAsset) => {
      updateAsset(asset.id, asset);
      console.log('updated', asset);
    });
    return () => unsubscribe();
  }, [updateAsset]);
}
