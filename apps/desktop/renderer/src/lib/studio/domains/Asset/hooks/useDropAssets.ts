import { useDocStore } from '@/lib/studio/hooks/useStudioStores';
import { ALL_FILE_EXTENSIONS } from '@/lib/studio/utils/file-extension';
import { useCallback, useState, type DragEvent } from 'react';

/**
 * OS에서 파일을 드래그&드롭하여 에셋을 추가하는 훅
 * @returns { isDragOver, handlers } — 상태 + div에 spread할 이벤트 핸들러
 */
export function useDropAssets() {
  const addAsset = useDocStore((state) => state.addAsset);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      // Electron sandbox에서는 File.path가 비어있으므로 webUtils 사용
      const validPaths = files
        .map((f) => window.app.getPathForFile(f))
        .filter((p): p is string => {
          if (!p) return false;
          const ext = p.slice(p.lastIndexOf('.')).toLowerCase();
          return ALL_FILE_EXTENSIONS.includes(ext);
        });

      if (validPaths.length === 0) return;

      const assets = await Promise.all(
        validPaths.map((filePath) =>
          window.app.invoke('asset:create', filePath)
        )
      );
      addAsset(assets);
    },
    [addAsset]
  );

  return {
    isDragOver,
    dropHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
