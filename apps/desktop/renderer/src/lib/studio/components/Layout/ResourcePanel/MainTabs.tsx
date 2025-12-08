import { cn } from '@renderer/utils/cn';
import type { IResourceTab } from '@renderer/lib/studio/constants/resource';

interface MainTabsProps {
  tabs: IResourceTab[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export function MainTabs({ tabs, activeIndex, onTabChange }: MainTabsProps) {
  return (
    <div className="shrink-0 flex gap-1 p-1 border-b border-neutral-950 overflow-y-hidden overflow-x-auto">
      {tabs.map((tab, i) => (
        <button
          key={tab.name}
          onClick={() => onTabChange(i)}
          className={cn(
            'flex flex-col items-center gap-1 px-2 py-1 text-xs rounded',
            activeIndex === i ? 'text-[dodgerblue]' : 'hover:bg-neutral-800'
          )}
        >
          {tab.IconComp && <tab.IconComp size={18} />}
          <span className="text-xs">{tab.name}</span>
        </button>
      ))}
    </div>
  );
}
