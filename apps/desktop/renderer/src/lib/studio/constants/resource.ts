import {
  Box,
  Clapperboard,
  Headphones,
  Image,
  type LucideIcon,
  Pentagon,
  Type,
} from 'lucide-react';
import { AllAssets } from '@renderer/lib/studio/domains/Asset/components/AllAssets';
import { VideoAssets } from '@renderer/lib/studio/domains/Asset/components/VideoAssets';
import { ImageAssets } from '@renderer/lib/studio/domains/Asset/components/ImageAssets';
import { AudioAssets } from '@renderer/lib/studio/domains/Asset/components/AudioAssets';

export interface IResourceTab {
  name: string;
  subTabs?: IResourceTab[];
  IconComp: LucideIcon | null;
  ContentComp?: React.ComponentType | null;
}

export const RESOURCE_TABS: IResourceTab[] = [
  {
    name: '에셋',
    subTabs: [
      { name: '전체', IconComp: null, ContentComp: AllAssets },
      {
        name: '비디오',
        IconComp: Clapperboard,
        ContentComp: VideoAssets,
      },
      { name: '이미지', IconComp: Image, ContentComp: ImageAssets },
      { name: '오디오', IconComp: Headphones, ContentComp: AudioAssets },
      { name: '텍스트', IconComp: Type, ContentComp: null },
      { name: '도형', IconComp: Pentagon, ContentComp: null },
    ],
    IconComp: Box,
    ContentComp: null,
  },
];
