import { useMemo, useState, useCallback } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowDownWideNarrow,
  Box,
  Clapperboard,
  FolderUp,
  Headphones,
  Pentagon,
  Type,
  Image,
  type LucideIcon,
} from 'lucide-react';
import { GradientScroll } from '@/components/GradientScroll';
import { useSelectAssets } from '@/lib/studio/domains/Asset/hooks/useSelectAssets';
import { useDocStore } from '@/lib/studio/hooks/useStudioStores';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AllAssets } from '../../domains/Asset/components/lists/AllAssets';
import { VideoAssets } from '../../domains/Asset/components/lists/VideoAssets';
import { ImageAssets } from '../../domains/Asset/components/lists/ImageAssets';
import { AudioAssets } from '../../domains/Asset/components/lists/AudioAssets';
import { TextAssets } from '../../domains/Asset/components/lists/TextAssets';
import { ShapeAssets } from '../../domains/Asset/components/lists/ShapeAssets';

interface IResourceTab {
  name: string;
  IconComp: LucideIcon;
  ContentComp: React.ComponentType<{ searchText?: string }>;
}

const RESOURCE_TABS: IResourceTab[] = [
  { name: 'All', IconComp: Box, ContentComp: AllAssets },
  { name: 'Video', IconComp: Clapperboard, ContentComp: VideoAssets },
  { name: 'Image', IconComp: Image, ContentComp: ImageAssets },
  { name: 'Audio', IconComp: Headphones, ContentComp: AudioAssets },
  { name: 'Text', IconComp: Type, ContentComp: TextAssets },
  { name: 'Shape', IconComp: Pentagon, ContentComp: ShapeAssets },
];

export function ResourcePanel() {
  const setAssets = useDocStore((s) => s.setAssets);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const activeTab = useMemo(
    () => RESOURCE_TABS[activeTabIndex],
    [activeTabIndex]
  );
  const handleSelectFiles = useSelectAssets();
  const handleSortBy = useCallback(
    (sort: string) => {
      setSortBy(sort);
      setAssets((assets) => {
        const sorted = [...assets];
        switch (sort) {
          case 'date':
            sorted.sort((a, b) => {
              const aDate = a.metadata.createdAt;
              const bDate = b.metadata.createdAt;
              if (!aDate && !bDate) return 0;
              if (!aDate) return 1;
              if (!bDate) return -1;
              return bDate.localeCompare(aDate);
            });
            break;
          case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case 'size':
            sorted.sort(
              (a, b) => (b.metadata.size || 0) - (a.metadata.size || 0)
            );
            break;
        }
        return sorted;
      });
    },
    [setAssets]
  );

  return (
    <div className="h-full flex flex-col select-none">
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

      {/* Tab Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <SearchAndSortBar
          searchText={searchText}
          onSearchChange={setSearchText}
          sortBy={sortBy}
          onSortChange={handleSortBy}
        />

        {/* Upload Button */}
        <button
          className="flex justify-center items-center gap-2 text-sm py-4 m-2 rounded text-neutral-400 hover:bg-neutral-700/20 hover:text-white transition-colors cursor-pointer border border-dashed border-neutral-700/40"
          onClick={handleSelectFiles}
        >
          <FolderUp stroke="currentColor" size={20} />
          <span>UPLOAD</span>
        </button>

        {/* Content Grid */}
        <div className="flex-1 overflow-auto p-3">
          <activeTab.ContentComp key={activeTabIndex} searchText={searchText} />
        </div>
      </div>
    </div>
  );
}

// 검색 및 정렬 바
const SearchAndSortBar = ({
  searchText,
  onSearchChange,
  sortBy,
  onSortChange,
}: {
  searchText: string;
  onSearchChange: (text: string) => void;
  sortBy: string;
  onSortChange: (sortBy: string) => void;
}) => {
  return (
    <div className="shrink-0 px-3 py-2 border-b border-neutral-800 flex items-center justify-between gap-2">
      <Input
        placeholder="search..."
        className=""
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <SortBySelect sortBy={sortBy} onChange={onSortChange} />
    </div>
  );
};

// 정렬 버튼
const SortBySelect = ({
  sortBy,
  onChange,
}: {
  sortBy: string;
  onChange: (sortBy: string) => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm">
          <ArrowDownWideNarrow />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuCheckboxItem
          checked={sortBy === 'date'}
          onCheckedChange={() => onChange('date')}
          className={cn('text-xs', {
            'bg-neutral-800': sortBy === 'date',
          })}
        >
          Date
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={sortBy === 'name'}
          onCheckedChange={() => onChange('name')}
          className={cn('text-xs', {
            'bg-neutral-800': sortBy === 'name',
          })}
        >
          Name
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={sortBy === 'size'}
          onCheckedChange={() => onChange('size')}
          className={cn('text-xs', {
            'bg-neutral-800': sortBy === 'size',
          })}
        >
          Size
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
