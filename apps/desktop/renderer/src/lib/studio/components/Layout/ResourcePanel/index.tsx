import { useState } from 'react';
import { RESOURCE_TABS } from '@/lib/studio/constants/resource';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FolderOpen } from 'lucide-react';

export function ResourcePanel() {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [activeSubTabIndex, setActiveSubTabIndex] = useState(0);

  const activeTab = RESOURCE_TABS[activeTabIndex];
  const activeSubTab = activeTab?.subTabs?.[activeSubTabIndex];

  const handleMainTabChange = (index: number) => {
    setActiveTabIndex(index);
    setActiveSubTabIndex(0);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-200">
              Resources
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
            {RESOURCE_TABS.length} types
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="shrink-0 px-2 py-2 border-b border-neutral-800/50">
        <ToggleGroup
          type="single"
          value={String(activeTabIndex)}
          onValueChange={(v) => v && handleMainTabChange(Number(v))}
          className="flex flex-wrap gap-1 justify-start"
        >
          {RESOURCE_TABS.map((tab, i) => (
            <ToggleGroupItem
              key={tab.name}
              value={String(i)}
              size="sm"
              className={cn(
                'h-8 px-3 gap-1.5 text-xs rounded-md',
                'data-[state=on]:bg-neutral-700 data-[state=on]:text-white',
                'data-[state=off]:text-neutral-400 data-[state=off]:hover:text-neutral-200'
              )}
            >
              {tab.IconComp && <tab.IconComp className="h-3.5 w-3.5" />}
              <span>{tab.name}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Sub Tabs */}
      {activeTab?.subTabs && activeTab.subTabs.length > 0 && (
        <div className="shrink-0 px-2 py-1.5 bg-neutral-800/30">
          <div className="flex items-center gap-1 overflow-x-auto">
            {activeTab.subTabs.map((subTab, i) => (
              <button
                key={subTab.name}
                onClick={() => setActiveSubTabIndex(i)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all',
                  'whitespace-nowrap shrink-0',
                  activeSubTabIndex === i
                    ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30'
                    : 'text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200'
                )}
              >
                {subTab.IconComp && <subTab.IconComp className="h-3 w-3" />}
                {subTab.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Separator className="bg-neutral-800/50" />

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {activeSubTab?.ContentComp ? (
          <activeSubTab.ContentComp />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-neutral-500">
            <div className="w-12 h-12 rounded-xl bg-neutral-800/50 flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-neutral-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-400">No content</p>
              <p className="text-xs text-neutral-500">
                Select a tab to view resources
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
