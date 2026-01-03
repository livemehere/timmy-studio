import { Clapperboard, House, Settings, Video } from 'lucide-react';
import type { TDockItem } from '../ui/Docks';

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
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={18} />,
      onClick: () => navigate('/settings'),
    },
  ];
}
