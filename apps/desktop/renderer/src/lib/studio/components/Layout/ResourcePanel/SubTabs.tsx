import { cn } from '@/lib/utils';
import type { IResourceTab } from '@/lib/studio/constants/resource';

interface SubTabsProps {
  tabs: IResourceTab[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export function SubTabs({ tabs, activeIndex, onTabChange }: SubTabsProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-neutral-800/30 overflow-x-auto">
      {tabs.map((subTab, i) => (
        <button
          key={subTab.name}
          onClick={() => onTabChange(i)}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all',
            'whitespace-nowrap shrink-0',
            activeIndex === i
              ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30'
              : 'text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200'
          )}
        >
          {subTab.IconComp && <subTab.IconComp className="h-3 w-3" />}
          {subTab.name}
        </button>
      ))}
    </div>
  );
}
