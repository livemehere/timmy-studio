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
import { VideoResourceContent } from '@renderer/lib/studio/components/ResourceContent/VideoResourceContent';

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
        ContentComp: VideoResourceContent,
      },
      { name: 'Images', IconComp: Image, ContentComp: null },
      { name: 'Audio', IconComp: Headphones, ContentComp: null },
      { name: 'Text', IconComp: Type, ContentComp: null },
      { name: 'Shapes', IconComp: Pentagon, ContentComp: null },
    ],
    IconComp: Box,
    ContentComp: null,
  },
];
