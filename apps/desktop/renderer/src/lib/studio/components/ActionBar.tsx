import {
  Plus,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useDocStore, useInteractionStore } from '../hooks/useStudioStores';
import { cn } from '@/lib/utils';

export function ActionBar() {
  const tracks = useDocStore((state) => state.tracks);
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);
  const clipboard = useInteractionStore((state) => state.clipboard);
  const addTrack = useDocStore((state) => state.addTrack);

  const totalClips = tracks.reduce((sum, t) => sum + t.clips.length, 0);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-10 px-3 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-1">
          {/* Track Actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1.5"
                onClick={() => addTrack({ type: 'graphic' })}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add Track</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Add new track</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Clip Actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={selectedClipIds.length === 0}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Copy (⌘C)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={selectedClipIds.length === 0}
              >
                <Scissors className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Cut (⌘X)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!clipboard}
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Paste (⌘V)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                disabled={selectedClipIds.length === 0}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Delete (⌫)</TooltipContent>
          </Tooltip>
        </div>

        {/* Info */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1">
            <Layers className="h-3 w-3" />
            {tracks.length} tracks
          </Badge>
          {selectedClipIds.length > 0 && (
            <Badge className="h-5 px-1.5 text-[10px] bg-blue-600/20 text-blue-400 border-blue-500/30">
              {selectedClipIds.length} selected
            </Badge>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
