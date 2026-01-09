import * as react from 'react';
import {
  Ellipsis,
  Eye,
  LockKeyhole,
  type LucideProps,
  VolumeOff,
  Clipboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineClip } from '@/lib/studio/components/Timeline/TimelineClip';
import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import { ContextMenu } from '@/components/ContextMenu';
import { useToast } from '@/components/Toast';

function TrackButton({
  icon: IconComp,
  active,
  onClick,
}: {
  icon: react.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & react.RefAttributes<SVGSVGElement>
  >;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn('hover:bg-neutral-700 p-1 rounded')}
      onClick={onClick}
    >
      <IconComp size={14} color={active ? 'dodgerblue' : undefined} />
    </button>
  );
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

  const toast = useToast();

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
        toast.error('Cannot paste', 'Clip would overlap with existing clip');
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
          toast.error('Cannot paste', 'Original track not found');
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
          toast.error(
            'Cannot paste',
            'Clips would overlap with existing clips'
          );
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

  const contextMenuSections = [
    {
      items: [
        {
          label: 'Paste',
          icon: Clipboard,
          shortcut: '⌘V',
          onSelect: handlePaste,
          disabled: !clipboard,
        },
      ],
    },
  ];

  const isActive = activeTrackId === trackId;

  return (
    <div
      style={{
        height: trackHeight,
      }}
      className={'bg-neutral-850 flex'}
      onPointerDown={handlePointerDown}
    >
      <div
        className={cn(
          'sticky left-0 z-50 bg-neutral-800 shrink-0 flex items-center justify-between gap-1.5 px-2',
          {
            'ring-2 ring-inset ring-blue-500/50': isActive,
          }
        )}
        style={{ width: trackTitleWidth }}
      >
        <div className="flex items-center gap-1.5">
          <TrackButton
            icon={LockKeyhole}
            active={track.locked}
            onClick={() => toggleTrackLock(track.id, !track.locked)}
          />
          <TrackButton icon={Eye} />
          <TrackButton icon={VolumeOff} />
          <TrackButton icon={Ellipsis} />
        </div>
        <span className="text-xs text-neutral-400 font-mono pointer-events-none relative">
          z:{track.zIndex}
        </span>
      </div>

      <ContextMenu sections={contextMenuSections}>
        <div
          ref={trackContentRef}
          className={cn('bg-neutral-800 flex-1 relative transition-colors', {
            'bg-cyan-900/30': isHovering,
            'ring-2 ring-inset ring-blue-500/50': isActive,
          })}
          onContextMenu={handleContextMenu}
          onClick={handleClick}
        >
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
      </ContextMenu>
    </div>
  );
}
