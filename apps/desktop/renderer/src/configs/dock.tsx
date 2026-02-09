import { Clapperboard, House, Settings, Video, Shapes } from 'lucide-react';
import type { TDockItem } from '../components/Docks';

export function createDockItems({
  navigate,
}: {
  navigate: (path: string) => void;
}): TDockItem[] {
  return [
    {
      id: 'home',
      label: 'Home',
      icon: <House size={18} />,
      onClick: () => navigate('/'),
    },
    {
      id: 'video-player',
      label: 'Video Player',
      icon: <Video size={18} />,
      onClick: () => navigate('/video-player'),
    },
    {
      id: 'video-editor',
      label: 'video-editor',
      icon: <Clapperboard size={18} />,
      onClick: () => navigate('/video-editor'),
    },
    {
      id: 'pixi-playground',
      label: 'Pixi Playground',
      icon: <Shapes size={18} />,
      onClick: () => navigate('/pixi-playground'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={18} />,
      onClick: () => navigate('/settings'),
    },
    ...(import.meta.env.DEV
      ? [
          {
            id: 'test-page',
            label: 'Test Page',
            icon: <Settings size={18} />,
            onClick: () => navigate('/test'),
          },
        ]
      : []),
  ];
}
