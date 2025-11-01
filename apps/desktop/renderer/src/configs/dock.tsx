import { Clapperboard, House, Settings } from 'lucide-react';
import type { TDockItem } from '../components/UI/Docks';

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
