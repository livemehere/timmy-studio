import { useState } from 'react';
import { RESOURCE_TABS } from '@/lib/studio/constants/resource';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Upload, ChevronDown } from 'lucide-react';
import { css } from '@emotion/react';
import { GradientScroll } from '@/components/GradientScroll';

export function ResourcePanel() {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [sourceType, setSourceType] = useState<'local' | 'import'>('local');
  const [sortBy, setSortBy] = useState('date');
  const [filterType, setFilterType] = useState('all');

  const activeTab = RESOURCE_TABS[activeTabIndex];

  return (
    <div className="h-full flex flex-col">
      {/* Top Tabs */}

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
        {/* Left Sidebar */}
        <div className="w-28 shrink-0 border-r border-neutral-800 flex flex-col">
          {/* Source Type Toggle */}
          <div className="p-2 space-y-1">
            <button
              onClick={() => setSourceType('local')}
              className={cn(
                'w-full px-3 py-2 text-xs font-medium rounded-md transition-colors text-left',
                sourceType === 'local'
                  ? 'bg-blue-600 text-white'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              )}
            >
              Local
            </button>
            <button
              onClick={() => setSourceType('import')}
              className={cn(
                'w-full px-3 py-2 text-xs font-medium rounded-md transition-colors text-left flex items-center gap-1.5',
                sourceType === 'import'
                  ? 'bg-blue-600 text-white'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              )}
            >
              <Upload className="h-3 w-3" />
              Import
            </button>
          </div>

          <Separator className="bg-neutral-800" />

          {/* Library Section */}
          <div className="p-2">
            <button className="w-full px-3 py-2 text-xs font-medium text-left text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-md transition-colors flex items-center gap-1">
              <ChevronDown className="h-3 w-3" />
              Library
            </button>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="shrink-0 px-3 py-2 border-b border-neutral-800 flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 gap-2 text-xs bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
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

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-20 text-xs bg-transparent border-neutral-700">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="favorite">Favorite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content Grid */}
          <div className="flex-1 overflow-auto p-3">
            {activeTab?.ContentComp && <activeTab.ContentComp />}
          </div>
        </div>
      </div>
    </div>
  );
}
