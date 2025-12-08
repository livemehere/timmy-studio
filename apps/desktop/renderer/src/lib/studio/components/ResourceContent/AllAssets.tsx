import { useDocAssets } from '@renderer/lib/studio/hooks';
import { Assets } from './Assets';
import { ALL_FILE_EXTENSIONS } from '@renderer/lib/studio/utils/file-extension';

export function AllAssets() {
  const assets = useDocAssets();

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

    for (const filePath of result.filePaths) {
      const newAsset = await window.app.invoke('createAsset', filePath);
      console.log('asset :', newAsset);
      // Here you would typically add the asset to your document/store
    }
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
      <Assets assets={assets} emptyMessage="No assets" />
    </div>
  );
}
