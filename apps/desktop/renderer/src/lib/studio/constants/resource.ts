import {
  Box,
  Clapperboard,
  Headphones,
  Image,
  type LucideIcon,
  Pentagon,
  Type,
} from 'lucide-react';
import { AllAssets } from '@renderer/lib/studio/components/ResourceContent/AllAssets';
import { VideoAssets } from '@renderer/lib/studio/components/ResourceContent/VideoAssets';
import { ImageAssets } from '@renderer/lib/studio/components/ResourceContent/ImageAssets';
import { AudioAssets } from '@renderer/lib/studio/components/ResourceContent/AudioAssets';

export interface IResourceTab {
  name: string;
  subTabs?: IResourceTab[];
  IconComp: LucideIcon | null;
  ContentComp?: React.ComponentType | null;
}

export const RESOURCE_TABS: IResourceTab[] = [
  {
    name: 'Assets',
    subTabs: [
      { name: 'All', IconComp: null, ContentComp: AllAssets },
      {
        name: 'Videos',
        IconComp: Clapperboard,
        ContentComp: VideoAssets,
      },
      { name: 'Images', IconComp: Image, ContentComp: ImageAssets },
      { name: 'Audio', IconComp: Headphones, ContentComp: AudioAssets },
      { name: 'Text', IconComp: Type, ContentComp: null },
      { name: 'Shapes', IconComp: Pentagon, ContentComp: null },
    ],
    IconComp: Box,
    ContentComp: null,
  },
];
