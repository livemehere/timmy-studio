import { Clapperboard, House } from 'lucide-react';
import type { TDockItem } from '../components/UI/Docks';

export const DOCKS: TDockItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: <House size={18} />,
    onClick: () => alert('Home clicked'),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Clapperboard size={18} />,
    onClick: () => alert('Settings clicked'),
  },
];
