import { useState } from 'react';
import { RESOURCE_TABS } from '@/lib/studio/constants/resource';
import { MainTabs } from '@/lib/studio/components/Layout/ResourcePanel/MainTabs';
import { SubTabs } from '@/lib/studio/components/Layout/ResourcePanel/SubTabs';

export function ResourcePanel() {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [activeSubTabIndex, setActiveSubTabIndex] = useState(0);

  const activeTab = RESOURCE_TABS[activeTabIndex];
  const activeSubTab = activeTab?.subTabs?.[activeSubTabIndex];
  const ContentComp = activeSubTab?.ContentComp;

  const handleMainTabChange = (index: number) => {
    setActiveTabIndex(index);
    setActiveSubTabIndex(0);
  };

  return (
    <div className="h-full flex flex-col">
      <MainTabs
        tabs={RESOURCE_TABS}
        activeIndex={activeTabIndex}
        onTabChange={handleMainTabChange}
      />

      <div className="flex flex-1 min-h-0">
        {activeTab?.subTabs && (
          <SubTabs
            tabs={activeTab.subTabs}
            activeIndex={activeSubTabIndex}
            onTabChange={setActiveSubTabIndex}
          />
        )}

        <div className="flex-1 overflow-auto p-2">
          {ContentComp ? (
            <ContentComp />
          ) : (
            <div className="w-full h-full flex justify-center items-center text-neutral-500 text-sm select-none">
              No content
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
