import { useState } from 'react';
import {
  Box,
  Clapperboard,
  Image,
  Headphones,
  Pentagon,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { VideoResourceContent } from '../Resource/Contents/VideoResourceContent';
import { cn } from '@renderer/utils/cn';
import { AllAssets } from '../Resource/Contents/AllAssets';

interface IResourceTab {
  name: string;
  subTabs?: IResourceTab[];
  IconComp: LucideIcon | null;
  ContentComp?: React.ComponentType | null;
}

const TABS: IResourceTab[] = [
  {
    name: 'Assets',
    subTabs: [
      { name: 'All', IconComp: null, ContentComp: AllAssets },
      {
        name: 'Videos',
        IconComp: Clapperboard,
        ContentComp: VideoResourceContent,
      },
      { name: 'Images', IconComp: Image, ContentComp: null },
      { name: 'Audio', IconComp: Headphones, ContentComp: null },
      { name: 'Text', IconComp: Type, ContentComp: null },
      { name: 'Shapes', IconComp: Pentagon, ContentComp: null },
    ],
    IconComp: Box,
    ContentComp: null,
  },
];

export function ResourcePanel() {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [activeSubTabIndex, setActiveSubTabIndex] = useState(0);

  const activeTab = TABS[activeTabIndex];
  const activeSubTab = activeTab?.subTabs?.[activeSubTabIndex];
  const ContentComp = activeSubTab?.ContentComp;

  return (
    <div className="h-full flex flex-col">
      {/* Main Tabs */}
      <div className="flex gap-1 p-1 border-b border-neutral-950 overflow-y-hidden overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab.name}
            onClick={() => {
              setActiveTabIndex(i);
              setActiveSubTabIndex(0);
            }}
            className={cn(
              'flex flex-col items-center gap-1 px-2 py-1 text-xs rounded',
              activeTabIndex === i
                ? 'text-[dodgerblue]'
                : 'hover:bg-neutral-800'
            )}
          >
            {tab.IconComp && <tab.IconComp size={18} />}
            <span className="text-xs">{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-1">
        {/* Sub Tabs */}
        {activeTab?.subTabs && (
          <div className="flex flex-col gap-2 p-2">
            {activeTab.subTabs.map((subTab, i) => (
              <button
                key={subTab.name}
                onClick={() => setActiveSubTabIndex(i)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1 text-xs rounded',
                  activeSubTabIndex === i
                    ? 'bg-neutral-800 text-[dodgerblue]'
                    : 'hover:bg-neutral-800'
                )}
              >
                {subTab.IconComp && <subTab.IconComp size={14} />}
                <span className="text-xs">{subTab.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content */}
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
