import { useDocStore } from '../../../hooks/useStudioStores';
import { AssetRenderer } from './AssetRenderer';
import { ALL_FILE_EXTENSIONS } from '@renderer/lib/studio/utils/file-extension';

export function AllAssets() {
  const assets = useDocStore((state) => state.assets);

  const addAsset = useDocStore((state) => state.addAsset);

  const handleSelectFiles = async () => {
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
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button
          className="text-xs bg-neutral-700 rounded px-2 py-0.5 hover:bg-neutral-600 cursor-pointer"
          onClick={handleSelectFiles}
        >
          가져오기
        </button>
      </div>
      <AssetRenderer assets={assets} emptyMessage="No assets" />
    </div>
  );
}
