import * as react from 'react';
import {
  Eye,
  EyeOff,
  LockKeyhole,
  LockKeyholeOpen,
  type LucideProps,
  Volume2,
  VolumeOff,
  Clipboard,
  Music,
  Film,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineClip } from '@/lib/studio/domains/Timeline/TimelineClip';
import {
  useDocStore,
  useEngineStore,
  useInteractionStore,
} from '../../hooks/useStudioStores';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Z_INDEX } from '../../constants/zIndex';
import { toast } from 'sonner';

function TrackButton({
  icon: IconComp,
  activeIcon: ActiveIconComp,
  active,
  onClick,
  tooltip,
  activeColor = 'text-blue-400',
}: {
  icon: react.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & react.RefAttributes<SVGSVGElement>
  >;
  activeIcon?: react.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & react.RefAttributes<SVGSVGElement>
  >;
  active?: boolean;
  onClick?: () => void;
  tooltip?: string;
  activeColor?: string;
}) {
  const Icon = active && ActiveIconComp ? ActiveIconComp : IconComp;
  const button = (
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

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

export function TimelineTrack({
  trackId,
  trackTitleWidth,
  trackHeight,
  pxPerSec,
}: {
  trackId: string;
  trackTitleWidth: number;
  trackHeight: number;
  pxPerSec: number;
}) {
  const getTrackById = useDocStore((state) => state.getTrackById);
  const updateTrack = useDocStore((state) => state.updateTrack);
  const removeTrack = useDocStore((state) => state.removeTrack);
  const addClipToTrack = useDocStore((state) => state.addClipToTrack);
  const tracks = useDocStore((state) => state.tracks);
  const track = getTrackById(trackId);
  const activeTrackId = useDocStore((state) => state.activeTrackId);
  const setActiveTrackId = useDocStore((state) => state.setActiveTrackId);

  const draggingClipId = useInteractionStore((state) => state.draggingClipId);
  const hoverTrackId = useInteractionStore((state) => state.hoverTrackId);
  const clipboard = useInteractionStore((state) => state.clipboard);
  const setLastClickedTime = useInteractionStore(
    (state) => state.setLastClickedTime
  );

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

  const [contextMenuPosition, setContextMenuPosition] = react.useState<
    number | null
  >(null);
  const trackContentRef = react.useRef<HTMLDivElement>(null);

  const isHovering = draggingClipId && hoverTrackId === trackId;

  if (!track) {
    throw new Error(`Track(${trackId}) not found`);
  }

  const toggleTrackLock = (trackId: string, locked: boolean) => {
    updateTrack(trackId, { locked });
  };

  const handlePointerDown = () => {
    setActiveTrackId(trackId);
  };

  const handleClick = (e: react.MouseEvent) => {
    if (!trackContentRef.current) return;

    const rect = trackContentRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const timeAtMouseSec = mouseX / pxPerSec;
    const timeAtMouseMs = timeAtMouseSec * 1000; // Convert to milliseconds

    console.log('[TimelineTrack] Clicked at time:', timeAtMouseMs);
    setLastClickedTime(timeAtMouseMs);
  };

  const handleContextMenu = (e: react.MouseEvent) => {
    if (!trackContentRef.current) return;

    const rect = trackContentRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const timeAtMouseSec = mouseX / pxPerSec;
    const timeAtMouseMs = timeAtMouseSec * 1000; // Convert to milliseconds

    console.log('[TimelineTrack] Context menu opened at time:', {
      timeAtMouseSec,
      timeAtMouseMs,
    });
    setContextMenuPosition(timeAtMouseMs);
  };

  const handlePaste = () => {
    console.log(
      '[TimelineTrack] handlePaste called, contextMenuPosition:',
      contextMenuPosition
    );

    if (!clipboard) {
      console.log('[TimelineTrack] No clipboard data');
      return;
    }

    // 붙여넣을 시작 위치
    const pasteStartTime =
      contextMenuPosition === null ? 0 : contextMenuPosition;

    // 단일 클립: 이 트랙에 붙여넣기
    if (clipboard.clips.length === 1) {
      const clipItem = clipboard.clips[0];
      const duration = clipItem.clip.endTime - clipItem.clip.startTime;
      const newStartTime = pasteStartTime;
      const newEndTime = newStartTime + duration;

      // 겹침 체크
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

      // 클립 붙여넣기
      addClipToTrack(trackId, {
        ...clipItem.clip,
        startTime: newStartTime,
        endTime: newEndTime,
      });

      console.log('[TimelineTrack] Pasted clip at:', pasteStartTime);
      toast.success('Clip pasted');
    }
    // 다중 클립: 각 원본 트랙에 붙여넣기
    else {
      const newClipsData: Array<{
        trackId: string;
        clipData: any;
        newStartTime: number;
        newEndTime: number;
      }> = [];

      // 각 클립의 새 위치 계산
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

      // 겹침 체크 (각 트랙에 대해)
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

      // 모든 클립 붙여넣기 (각자의 트랙에)
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

    // Cut이든 Copy든 clipboard는 유지 (여러 번 붙여넣기 가능)
  };

  const isActive = activeTrackId === trackId;
  const syncedTrackIds =
    track.type === 'audio' ? syncedAudioTrackIds : syncedGraphicTrackIds;
  const failedTrackIds =
    track.type === 'audio' ? failedAudioTrackIds : failedGraphicTrackIds;
  const isSynced = syncedTrackIds.includes(track.id);
  const isFailed = failedTrackIds.includes(track.id);

  return (
    <div
      style={{
        height: trackHeight,
      }}
      className="bg-neutral-850 flex border-b border-neutral-800/50"
      onPointerDown={handlePointerDown}
    >
      <TooltipProvider delayDuration={200}>
        <div
          className={cn(
            'sticky left-0 bg-neutral-850 shrink-0 flex items-center gap-1 px-2 border-r border-neutral-800/50',
            {
              'bg-blue-950/30 border-l-2 border-l-blue-500': isActive,
            }
          )}
          style={{
            width: trackTitleWidth,
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
            <TrackButton
              icon={LockKeyholeOpen}
              activeIcon={LockKeyhole}
              active={track.locked}
              onClick={() => toggleTrackLock(track.id, !track.locked)}
              tooltip={track.locked ? 'Unlock' : 'Lock'}
              activeColor="text-orange-400"
            />
            <TrackButton
              icon={Eye}
              activeIcon={EyeOff}
              tooltip="Toggle visibility"
            />
            <TrackButton
              icon={Volume2}
              activeIcon={VolumeOff}
              tooltip="Toggle mute"
            />
          </div>

          {/* Status & zIndex */}
          <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
            {/* Status dot */}
            {isSynced && !isFailed && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Synced
                </TooltipContent>
              </Tooltip>
            )}
            {isFailed && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Failed
                </TooltipContent>
              </Tooltip>
            )}
            <span className="text-[10px] text-neutral-500 font-mono tabular-nums shrink-0">
              z:{track.zIndex}
            </span>
          </div>
        </div>
      </TooltipProvider>

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={trackContentRef}
            className={cn(
              'bg-neutral-800/50 flex-1 relative transition-colors',
              {
                'bg-cyan-900/20 ring-1 ring-inset ring-cyan-500/30': isHovering,
                'bg-blue-950/20': isActive,
              }
            )}
            onContextMenu={handleContextMenu}
            onClick={handleClick}
          >
            {/* Track Grid Pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)',
                backgroundSize: `${pxPerSec}px 100%`,
              }}
            />
            {track.clips.map((clip) => (
              <TimelineClip
                key={clip.id}
                trackId={track.id}
                clipId={clip.id}
                pxPerSec={pxPerSec}
                trackHeight={trackHeight}
              />
            ))}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onSelect={handlePaste} disabled={!clipboard}>
            <Clipboard className="h-4 w-4 mr-2" />
            <span>Paste</span>
            <ContextMenuShortcut>⌘V</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={() => {
              // Move track up (increase zIndex)
              const currentIndex = tracks.findIndex((t) => t.id === trackId);
              if (currentIndex > 0) {
                const aboveTrack = tracks[currentIndex - 1];
                const newZIndex = aboveTrack.zIndex + 1;
                updateTrack(trackId, { zIndex: newZIndex });
                toast.success('Track moved up');
              }
            }}
            disabled={tracks.findIndex((t) => t.id === trackId) === 0}
          >
            <ChevronUp className="h-4 w-4 mr-2" />
            <span>Move Up</span>
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => {
              // Move track down (decrease zIndex)
              const currentIndex = tracks.findIndex((t) => t.id === trackId);
              if (currentIndex < tracks.length - 1) {
                const belowTrack = tracks[currentIndex + 1];
                const newZIndex = belowTrack.zIndex - 1;
                updateTrack(trackId, { zIndex: newZIndex });
                toast.success('Track moved down');
              }
            }}
            disabled={
              tracks.findIndex((t) => t.id === trackId) === tracks.length - 1
            }
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            <span>Move Down</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={() => toggleTrackLock(trackId, !track.locked)}
          >
            {track.locked ? (
              <LockKeyholeOpen className="h-4 w-4 mr-2" />
            ) : (
              <LockKeyhole className="h-4 w-4 mr-2" />
            )}
            <span>{track.locked ? 'Unlock Track' : 'Lock Track'}</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onSelect={() => {
              if (tracks.length <= 1) {
                toast.error('Cannot delete', {
                  description: 'At least one track is required',
                });
                return;
              }
              removeTrack(trackId);
              toast.success('Track deleted');
            }}
            disabled={tracks.length <= 1}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span>Delete Track</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
