import {
  Box,
  Clapperboard,
  Headphones,
  Image,
  type LucideIcon,
  Pentagon,
  Type,
} from 'lucide-react';
import { AllAssets } from '@/lib/studio/domains/Asset/components/AllAssets';
import { VideoAssets } from '@/lib/studio/domains/Asset/components/VideoAssets';
import { ImageAssets } from '@/lib/studio/domains/Asset/components/ImageAssets';
import { AudioAssets } from '@/lib/studio/domains/Asset/components/AudioAssets';
import { TextAssets } from '@/lib/studio/domains/Asset/components/TextAssets';
import { ShapeAssets } from '@/lib/studio/domains/Asset/components/ShapeAssets';

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
