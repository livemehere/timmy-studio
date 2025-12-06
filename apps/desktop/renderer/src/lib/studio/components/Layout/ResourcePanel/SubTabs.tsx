import { cn } from '@renderer/utils/cn';
import type { IResourceTab } from '@renderer/lib/studio/constants/resource';

interface SubTabsProps {
  tabs: IResourceTab[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export function SubTabs({ tabs, activeIndex, onTabChange }: SubTabsProps) {
  return (
    <div className="flex flex-col gap-2 p-2">
      {tabs.map((subTab, i) => (
        <button
          key={subTab.name}
          onClick={() => onTabChange(i)}
          className={cn(
            'flex items-center gap-2 px-2 py-1 text-xs rounded',
            activeIndex === i
              ? 'bg-neutral-800 text-[dodgerblue]'
              : 'hover:bg-neutral-800'
          )}
        >
          {subTab.IconComp && <subTab.IconComp size={14} />}
          <span className="text-xs">{subTab.name}</span>
        </button>
      ))}
    </div>
  );
}
