import {
  Box,
  Clapperboard,
  Headphones,
  Image,
  type LucideIcon,
  Pentagon,
  Type,
} from 'lucide-react';
import { AllAssets } from '@/lib/studio/domains/Asset/components/lists/AllAssets';
import { VideoAssets } from '@/lib/studio/domains/Asset/components/lists/VideoAssets';
import { ImageAssets } from '@/lib/studio/domains/Asset/components/lists/ImageAssets';
import { AudioAssets } from '@/lib/studio/domains/Asset/components/lists/AudioAssets';
import { TextAssets } from '@/lib/studio/domains/Asset/components/lists/TextAssets';
import { ShapeAssets } from '@/lib/studio/domains/Asset/components/lists/ShapeAssets';

export interface IResourceTab {
  name: string;
  IconComp: LucideIcon;
  ContentComp: React.ComponentType<{ searchText?: string }>;
}

export const RESOURCE_TABS: IResourceTab[] = [
  { name: 'All', IconComp: Box, ContentComp: AllAssets },
  { name: 'Video', IconComp: Clapperboard, ContentComp: VideoAssets },
  { name: 'Image', IconComp: Image, ContentComp: ImageAssets },
  { name: 'Audio', IconComp: Headphones, ContentComp: AudioAssets },
  { name: 'Text', IconComp: Type, ContentComp: TextAssets },
  { name: 'Shape', IconComp: Pentagon, ContentComp: ShapeAssets },
];
