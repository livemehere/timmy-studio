import { useDocStore } from '@renderer/lib/studio/hooks/useStudioStores';
import { useEffect } from 'react';
import type { IAsset } from '@renderer/lib/studio/types/asset';

/**
 * @description main 프로세스에서 asset 의 비동기 처리가 끝나면 업데이트 이벤트가 오는데, 해당 에셋을 상태 업데이트
 */
export function useAssetUpdateSubscription() {
  const setAsset = useDocStore((state) => state.setAsset);

  useEffect(() => {
    const unsubscribe = window.app.on('updateAsset', (asset: IAsset) => {
      setAsset(asset);
    });

    return () => unsubscribe();
  }, [setAsset]);
}
