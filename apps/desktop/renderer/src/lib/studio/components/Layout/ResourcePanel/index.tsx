import { useMemo, useState } from 'react';
import { RESOURCE_TABS } from '@/lib/studio/constants/resource';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { GradientScroll } from '@/components/GradientScroll';
import { useSelectAssets } from '@/lib/studio/domains/Asset/hooks/useSelectAssets';

export function ResourcePanel() {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const activeTab = useMemo(
    () => RESOURCE_TABS[activeTabIndex],
    [activeTabIndex]
  );

  const handleSelectFiles = useSelectAssets();

  return (
    <div className="h-full flex flex-col">
      {/* Tab Selector */}
      <GradientScroll className="px-3 py-2">
        <ToggleGroup
          type="single"
          value={String(activeTabIndex)}
          onValueChange={(v) => v && setActiveTabIndex(Number(v))}
        >
          {RESOURCE_TABS.map((tab, i) => (
            <ToggleGroupItem
              key={tab.name}
              value={String(i)}
              size="lg"
              className={'text-xs data-[state=off]:text-neutral-400'}
            >
              <tab.IconComp className="h-4 w-4" />
              <span>{tab.name}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </GradientScroll>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Right Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="shrink-0 px-3 py-2 border-b border-neutral-800 flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 gap-2 text-xs bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
              onClick={handleSelectFiles}
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-24 text-xs bg-transparent border-neutral-700">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content Grid */}
          <div className="flex-1 overflow-auto p-3">
            <activeTab.ContentComp />
          </div>
        </div>
      </div>
    </div>
  );
}
