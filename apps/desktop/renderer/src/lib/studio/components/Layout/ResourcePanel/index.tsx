import { useMemo, useState } from 'react';
import { RESOURCE_TABS } from '@/lib/studio/constants/resource';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';

export function ResourcePanel() {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [activeSubTabIndex, setActiveSubTabIndex] = useState(0);

  const activeTab = RESOURCE_TABS[activeTabIndex];
  const activeSubTab = activeTab?.subTabs?.[activeSubTabIndex];

  const activeValue = activeSubTab?.name ?? '';
  const subTabValueMap = useMemo(
    () =>
      new Map(
        (activeTab?.subTabs ?? []).map((tab, index) => [tab.name, index])
      ),
    [activeTab?.subTabs]
  );

  const handleMainTabChange = (index: number) => {
    setActiveTabIndex(index);
    setActiveSubTabIndex(0);
  };

  return (
    <div className="h-full flex flex-col gap-3 p-2">
      {/* Main Tabs - Compact ButtonGroup */}
      <div className="shrink-0 flex items-center gap-2">
        <span className="text-xs text-neutral-500 font-medium">Resources</span>
        <ButtonGroup>
          {RESOURCE_TABS.map((tab, i) => (
            <Button
              key={tab.name}
              size="sm"
              variant={activeTabIndex === i ? 'default' : 'outline'}
              className={cn('h-7 px-2 text-xs gap-1')}
              onClick={() => handleMainTabChange(i)}
            >
              {tab.IconComp && <tab.IconComp size={14} />}
              {tab.name}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      {/* Sub Tabs - Compact Inline Buttons */}
      {activeTab?.subTabs && activeTab.subTabs.length > 0 && (
        <div className="shrink-0 flex flex-wrap gap-1">
          {activeTab.subTabs.map((subTab, i) => (
            <button
              key={subTab.name}
              onClick={() => setActiveSubTabIndex(i)}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
                activeSubTabIndex === i
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              )}
            >
              {subTab.IconComp && <subTab.IconComp size={12} />}
              {subTab.name}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeSubTab?.ContentComp ? (
          <activeSubTab.ContentComp />
        ) : (
          <div className="w-full h-full flex justify-center items-center text-neutral-500 text-sm select-none">
            No content
          </div>
        )}
      </div>
    </div>
  );
}
