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
  { name: '전체', IconComp: Box, ContentComp: AllAssets },
  { name: '비디오', IconComp: Clapperboard, ContentComp: VideoAssets },
  { name: '이미지', IconComp: Image, ContentComp: ImageAssets },
  { name: '오디오', IconComp: Headphones, ContentComp: AudioAssets },
  { name: '텍스트', IconComp: Type, ContentComp: TextAssets },
  { name: '도형', IconComp: Pentagon, ContentComp: ShapeAssets },
];
