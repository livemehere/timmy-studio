import {
  Eye,
  EyeOff,
  LockKeyhole,
  LockKeyholeOpen,
  Volume2,
  VolumeOff,
  Clipboard,
  Music,
  Film,
  Trash2,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDocStore,
  useEngineStore,
  useInteractionStore,
} from '../../hooks/useStudioStores';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Z_INDEX } from '../../constants/zIndex';
import { toast } from 'sonner';
import { selectTrackById } from '../../stores/docStore';

export function TrackHeader({
  trackId,
  headerWidth,
}: {
  trackId: string;
  headerWidth: number;
}) {
  const updateTrack = useDocStore((state) => state.updateTrack);
  const removeTrack = useDocStore((state) => state.removeTrack);
  const addClipToTrack = useDocStore((state) => state.addClipToTrack);
  const tracks = useDocStore((state) => state.tracks);
  const clipboard = useInteractionStore((state) => state.clipboard);
  const lastClickedTime = useInteractionStore((state) => state.lastClickedTime);

  const syncedGraphicTrackIds = useEngineStore(
    (state) => state.syncedGraphicTrackIds || []
  );
  const failedGraphicTrackIds = useEngineStore(
    (state) => state.failedGraphicTrackIds || []
  );
  const syncedAudioTrackIds = useEngineStore(
    (state) => state.syncedAudioTrackIds || []
  );
  const failedAudioTrackIds = useEngineStore(
    (state) => state.failedAudioTrackIds || []
  );

  const track = useDocStore(selectTrackById(trackId));

  if (!track) {
    return null;
  }

  const syncedTrackIds =
    track.type === 'audio' ? syncedAudioTrackIds : syncedGraphicTrackIds;
  const failedTrackIds =
    track.type === 'audio' ? failedAudioTrackIds : failedGraphicTrackIds;
  const isSynced = syncedTrackIds.includes(track.id);
  const isFailed = failedTrackIds.includes(track.id);
  const currentIndex = tracks.findIndex((t) => t.id === trackId);
  const canMoveUp = currentIndex > 0;
  const canMoveDown = currentIndex < tracks.length - 1;
  const canDelete = tracks.length > 1;

  const handleToggleLock = () => {
    updateTrack(trackId, { locked: !track.locked });
  };

  const handleMoveUp = () => {
    if (!canMoveUp) return;
    const aboveTrack = tracks[currentIndex - 1];
    const newZIndex = aboveTrack.zIndex + 1;
    updateTrack(trackId, { zIndex: newZIndex });
    toast.success('Track moved up');
  };

  const handleMoveDown = () => {
    if (!canMoveDown) return;
    const belowTrack = tracks[currentIndex + 1];
    const newZIndex = belowTrack.zIndex - 1;
    updateTrack(trackId, { zIndex: newZIndex });
    toast.success('Track moved down');
  };

  const handleDelete = () => {
    if (!canDelete) {
      toast.error('Cannot delete', {
        description: 'At least one track is required',
      });
      return;
    }
    removeTrack(trackId);
    toast.success('Track deleted');
  };

  const handlePaste = () => {
    console.log('[TimelineTrack] handlePaste called');

    if (!clipboard) {
      console.log('[TimelineTrack] No clipboard data');
      return;
    }

    const pasteStartTime = lastClickedTime === null ? 0 : lastClickedTime;

    if (clipboard.clips.length === 1) {
      const clipItem = clipboard.clips[0];
      const duration = clipItem.clip.endTime - clipItem.clip.startTime;
      const newStartTime = pasteStartTime;
      const newEndTime = newStartTime + duration;

      const hasOverlap = track.clips.some((existingClip) => {
        return !(
          newEndTime <= existingClip.startTime ||
          newStartTime >= existingClip.endTime
        );
      });

      if (hasOverlap) {
        console.error('[TimelineTrack] Cannot paste: clip would overlap');
        toast.error('Cannot paste', {
          description: 'Clip would overlap with existing clip',
        });
        return;
      }

      addClipToTrack(trackId, {
        ...clipItem.clip,
        startTime: newStartTime,
        endTime: newEndTime,
      });

      console.log('[TimelineTrack] Pasted clip at:', pasteStartTime);
      toast.success('Clip pasted');
    } else {
      const newClipsData: Array<{
        trackId: string;
        clipData: any;
        newStartTime: number;
        newEndTime: number;
      }> = [];

      clipboard.clips.forEach((clipItem) => {
        const duration = clipItem.clip.endTime - clipItem.clip.startTime;
        const newStartTime = pasteStartTime + clipItem.relativeStartTime;
        const newEndTime = newStartTime + duration;

        newClipsData.push({
          trackId: clipItem.trackId,
          clipData: {
            ...clipItem.clip,
            startTime: newStartTime,
            endTime: newEndTime,
          },
          newStartTime,
          newEndTime,
        });
      });

      for (const newClip of newClipsData) {
        const targetTrack = tracks.find((t) => t.id === newClip.trackId);
        if (!targetTrack) {
          console.error('[TimelineTrack] Track not found:', newClip.trackId);
          toast.error('Cannot paste', {
            description: 'Original track not found',
          });
          return;
        }

        const hasOverlap = targetTrack.clips.some((existingClip) => {
          return !(
            newClip.newEndTime <= existingClip.startTime ||
            newClip.newStartTime >= existingClip.endTime
          );
        });
        if (hasOverlap) {
          console.error('[TimelineTrack] Cannot paste: clips would overlap');
          toast.error('Cannot paste', {
            description: 'Clips would overlap with existing clips',
          });
          return;
        }
      }

      newClipsData.forEach((newClip) => {
        addClipToTrack(newClip.trackId, newClip.clipData);
      });

      console.log(
        '[TimelineTrack] Pasted clips:',
        clipboard.clips.length,
        'at:',
        pasteStartTime
      );
      toast.success(`${clipboard.clips.length} clips pasted`);
    }
  };

  return (
    <div
      className={cn(
        'sticky left-0 bg-neutral-900 shrink-0 flex items-center gap-1 px-2 border-r border-neutral-800/50'
      )}
      style={{
        width: headerWidth,
        zIndex: Z_INDEX.timeline.trackHeader,
      }}
    >
      {/* Track Type Icon */}
      <div className="flex items-center justify-center w-5 h-5 rounded bg-neutral-700/50">
        {track.type === 'audio' ? (
          <Music className="h-3 w-3 text-purple-400" />
        ) : (
          <Film className="h-3 w-3 text-emerald-400" />
        )}
      </div>

      {/* Track Controls */}
      <div className="flex items-center gap-0.5">
        <Button
          icon={LockKeyholeOpen}
          activeIcon={LockKeyhole}
          active={track.locked}
          onClick={handleToggleLock}
          activeColor="text-orange-400"
        />
        <Button icon={Eye} activeIcon={EyeOff} />
        <Button icon={Volume2} activeIcon={VolumeOff} />
      </div>

      {/* Status & zIndex */}
      <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
        {/* Status dot */}
        {isSynced && !isFailed && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        )}
        {isFailed && (
          <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
        )}
        <span className="text-[10px] text-neutral-500 font-mono tabular-nums shrink-0">
          z:{track.zIndex}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/50">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48" align="end" side="bottom">
            <DropdownMenuItem onSelect={handlePaste} disabled={!clipboard}>
              <Clipboard className="h-4 w-4 mr-2" />
              <span>Paste</span>
              <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleMoveUp} disabled={!canMoveUp}>
              <ChevronUp className="h-4 w-4 mr-2" />
              <span>Move Up</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleMoveDown} disabled={!canMoveDown}>
              <ChevronDown className="h-4 w-4 mr-2" />
              <span>Move Down</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleToggleLock}>
              {track.locked ? (
                <LockKeyholeOpen className="h-4 w-4 mr-2" />
              ) : (
                <LockKeyhole className="h-4 w-4 mr-2" />
              )}
              <span>{track.locked ? 'Unlock Track' : 'Lock Track'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={handleDelete}
              disabled={!canDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span>Delete Track</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function Button({
  icon: IconComp,
  activeIcon: ActiveIconComp,
  active,
  onClick,
  activeColor = 'text-blue-400',
}: {
  icon: LucideIcon;
  activeIcon?: LucideIcon;
  active?: boolean;
  onClick?: () => void;
  activeColor?: string;
}) {
  const Icon = active && ActiveIconComp ? ActiveIconComp : IconComp;
  return (
    <button
      className={cn(
        'p-1 rounded transition-colors',
        active
          ? `${activeColor} bg-neutral-700/50`
          : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/50'
      )}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
