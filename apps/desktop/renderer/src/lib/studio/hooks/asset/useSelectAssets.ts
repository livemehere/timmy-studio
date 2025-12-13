import { useDocStore } from '@renderer/lib/studio/hooks/useStudioStores';
import { ALL_FILE_EXTENSIONS } from '@renderer/lib/studio/utils/file-extension';
import { useCallback } from 'react';

/**
 * @description 파일 시스템에서, 리소스를 선택하고, ipc 를 통해서, 에셋을 생성한 후, 스토어에 추가하는 훅
 */
export function useSelectAssets() {
  const addAsset = useDocStore((state) => state.addAsset);

  return useCallback(async () => {
    const result = await window.app.invoke('showOpenDialog', {
      title: '파일 선택',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          extensions: ALL_FILE_EXTENSIONS,
          name: '사용가능',
        },
      ],
    });
    if (result.canceled) return;

    const assets = await Promise.all(
      result.filePaths.map((filePath) =>
        window.app.invoke('createAsset', filePath)
      )
    );
    addAsset(assets);
  }, []);
}
