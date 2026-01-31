import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { IResourceTab } from '@/lib/studio/constants/resource';

interface MainTabsProps {
  tabs: IResourceTab[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export function MainTabs({ tabs, activeIndex, onTabChange }: MainTabsProps) {
  return (
    <div className="shrink-0 px-2 py-2 border-b border-neutral-800">
      <ToggleGroup
        type="single"
        value={String(activeIndex)}
        onValueChange={(v) => v && onTabChange(Number(v))}
        className="flex gap-1 justify-start"
      >
        {tabs.map((tab, i) => (
          <ToggleGroupItem
            key={tab.name}
            value={String(i)}
            size="sm"
            className={cn(
              'h-9 px-3 flex-col gap-0.5 text-xs rounded-md',
              'data-[state=on]:bg-neutral-700 data-[state=on]:text-white',
              'data-[state=off]:text-neutral-400 data-[state=off]:hover:text-neutral-200'
            )}
          >
            {tab.IconComp && <tab.IconComp className="h-4 w-4" />}
            <span className="text-[10px]">{tab.name}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
