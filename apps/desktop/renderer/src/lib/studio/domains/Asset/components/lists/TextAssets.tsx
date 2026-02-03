import type { ITextData } from '@/lib/studio/types/text';
import type { ITextAsset } from '@/lib/studio/domains/Asset/types';
import { AssetList } from '@/lib/studio/domains/Asset/components/AssetList';
import { uid } from 'uid';

const createTextAsset = (textData: ITextData, name: string): ITextAsset => ({
  id: uid(8),
  name,
  type: 'text',
  textData,
  metadata: { size: 0 },
});

const TEXT_PRESETS: Array<{ name: string; data: ITextData }> = [
  {
    name: '기본 텍스트',
    data: {
      content: '기본 텍스트',
      fontSize: 50,
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'left',
    },
  },
];

export function TextAssets() {
  const textAssets = TEXT_PRESETS.map((preset) =>
    createTextAsset(preset.data, preset.name)
  );

  return <AssetList assets={textAssets} emptyMessage="No text available" />;
}
