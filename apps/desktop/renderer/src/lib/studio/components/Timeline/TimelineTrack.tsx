import * as react from 'react';
import {
  Ellipsis,
  Eye,
  LockKeyhole,
  type LucideProps,
  VolumeOff,
  Clipboard,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TimelineClip } from '@renderer/lib/studio/components/Timeline/TimelineClip';
import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import { ContextMenu } from '@renderer/components/ContextMenu';

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
  const track = getTrackById(trackId);
  const activeTrackId = useDocStore((state) => state.activeTrackId);
  const setActiveTrackId = useDocStore((state) => state.setActiveTrackId);

  const draggingClipId = useInteractionStore((state) => state.draggingClipId);
  const hoverTrackId = useInteractionStore((state) => state.hoverTrackId);
  const clipboard = useInteractionStore((state) => state.clipboard);
  const setLastClickedTime = useInteractionStore(
    (state) => state.setLastClickedTime
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

    const sourceClip = clipboard.clip;
    const duration = sourceClip.endTime - sourceClip.startTime;
    const newStartTime = contextMenuPosition === null ? 0 : contextMenuPosition;
    const newEndTime = newStartTime + duration;

    console.log('[TimelineTrack] Pasting at position:', {
      contextMenuPosition,
      newStartTime,
      newEndTime,
      duration,
    });

    console.log(
      '[TimelineTrack] Current track clips:',
      track.clips.map((c) => ({
        id: c.id,
        startTime: c.startTime,
        endTime: c.endTime,
      }))
    );

    // Check for overlaps with existing clips on this track
    const hasOverlap = track.clips.some((clip) => {
      const overlaps = !(
        newEndTime <= clip.startTime || newStartTime >= clip.endTime
      );

      if (overlaps) {
        console.log('[TimelineTrack] Found overlap with clip:', {
          clipId: clip.id,
          clipStart: clip.startTime,
          clipEnd: clip.endTime,
          newStart: newStartTime,
          newEnd: newEndTime,
        });
      }

      return overlaps;
    });

    if (hasOverlap) {
      console.error(
        '[TimelineTrack] Cannot paste: clip would overlap with existing clip'
      );
      alert('Cannot paste: clip would overlap with existing clip');
      return;
    }

    // 클립 데이터 복사 및 시간 수정
    const newClipData = {
      ...sourceClip,
      startTime: newStartTime,
      endTime: newEndTime,
    };

    // 트랙에 클립 추가 (새 ID 자동 생성됨)
    addClipToTrack(trackId, newClipData);

    console.log('[TimelineTrack] Pasted clip at time:', newStartTime);

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
