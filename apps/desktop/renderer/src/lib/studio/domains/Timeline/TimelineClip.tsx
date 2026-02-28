import { motion } from 'motion/react';
import {
  useDocStore,
  useEngineStore,
  useInteractionStore,
} from '../../hooks/useStudioStores';
import type { IClip } from '@/lib/studio/domains/Clip/types';
import { cn } from '@/lib/utils';
import { Z_INDEX } from '../../constants/zIndex';
import { getClipBg } from '../../constants/colors';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Copy,
  Scissors,
  Trash2,
  Files,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTimelineClipDrag } from './hooks/useTimelineClipDrag';
import { useClipContextActions } from './hooks/useClipContextActions';
import { ClipContent } from './components/ClipContent';
import { ClipResizeHandles } from './components/ClipResizeHandles';
import { useEffect } from 'react';
import { selectClipById, selectTrackById } from '../../stores/docStore';
import { registerClipMotion, unregisterClipMotion } from './clipMotionRegistry';

export function TimelineClip({
  clipId,
  pxPerSec,
  trackId,
  trackHeight,
}: {
  clipId: string;
  trackId: string;
  pxPerSec: number;
  trackHeight: number;
}) {
  // Use IClip to support both graphic and audio clips
  const clip = useDocStore(selectClipById<IClip>(trackId, clipId))!;

  useEffect(() => {
    console.log('clip', clip);
  }, [clip]);

  // Register motionX in the module-level registry for multi-clip drag
  const {
    clipRef,
    motionX,
    isCloneMode,
    isDragging,
    isMultiDrag,
    dragMode,
    displayStartTime,
    displayEndTime,
    displayTrimStart,
    displayTrimEnd,
    displayWidth,
    displayLeft,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleDragStart,
    handleDrag,
    handleWheel,
    handleClick,
    handleDragEnd,
  } = useTimelineClipDrag({
    clip,
    trackId,
    trackHeight,
    pxPerSec,
  });

  useEffect(() => {
    registerClipMotion(clipId, motionX, trackId);
    return () => unregisterClipMotion(clipId);
  }, [clipId, motionX, trackId]);

  const track = useDocStore(selectTrackById(trackId));
  const syncedGraphicClipIds = useEngineStore(
    (state) => state.syncedGraphicClipIds
  );
  const failedGraphicClipIds = useEngineStore(
    (state) => state.failedGraphicClipIds
  );
  const syncedAudioClipIds = useEngineStore(
    (state) => state.syncedAudioClipIds
  );
  const failedAudioClipIds = useEngineStore(
    (state) => state.failedAudioClipIds
  );

  const syncedClipIds =
    track?.type === 'audio' ? syncedAudioClipIds : syncedGraphicClipIds;
  const failedClipIds =
    track?.type === 'audio' ? failedAudioClipIds : failedGraphicClipIds;

  const isLoaded = syncedClipIds.includes(clipId);
  const isFailed = failedClipIds.includes(clipId);

  const isSelected = useInteractionStore((state) =>
    state.selectedClipIds.includes(clip.id)
  );

  const {
    handleCopy,
    handleCut,
    handleDuplicate,
    handleDelete,
    handleToggleLock,
    handleToggleVisibility,
  } = useClipContextActions({
    clip,
    trackId,
  });

  return (
    <>
      {/* Ghost Element: Alt 키로 복제 중일 때 원본 위치에 표시 */}
      {isCloneMode && isDragging && dragMode === 'move' && (
        <div
          className={cn(
            'absolute h-full px-2 py-1 rounded-md overflow-hidden pointer-events-none select-none border border-dashed border-white/10',
            // 투명한 배경색
            getClipBg(clip.type, 20)
          )}
          style={{
            width: displayWidth,
            left: displayLeft,
          }}
        >
          <span className="text-white/50 text-[10px]">{clip.name}</span>
        </div>
      )}

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            ref={clipRef}
            data-clip-id={clip.id}
            data-track-id={trackId}
            style={{
              width: displayWidth,
              left: displayLeft,
              zIndex: Z_INDEX.timeline.clip,
              x:
                dragMode === 'resize-start' || dragMode === 'resize-end'
                  ? 0
                  : motionX,
            }}
            className={cn(
              'absolute h-full rounded-md group overflow-hidden',
              // 배경색
              getClipBg(clip.type),
              'border border-white/20',
              {
                // 선택 상태
                'border-white': isSelected,
                // 비활성화 상태
                'opacity-50': !clip.enabled,
              }
            )}
            // 리사이즈: 드래그 비활성화, multi-drag: x축만, 단일: 자유
            drag={
              dragMode === 'resize-start' || dragMode === 'resize-end'
                ? false
                : isMultiDrag
                  ? 'x'
                  : true
            }
            dragMomentum={false}
            dragSnapToOrigin={dragMode === 'move'}
            dragElastic={0}
            // ---
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onWheel={handleWheel}
            onClick={handleClick}
            onDragEnd={handleDragEnd}
          >
            <ClipContent
              clip={clip}
              isLoaded={isLoaded}
              isFailed={isFailed}
              displayStartTime={displayStartTime}
              displayEndTime={displayEndTime}
              displayTrimStart={displayTrimStart}
              displayTrimEnd={displayTrimEnd}
            />
            <ClipResizeHandles />
          </motion.div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onSelect={handleCopy}>
            <Copy size={14} />
            <span>Copy</span>
            <ContextMenuShortcut>⌘C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleCut}>
            <Scissors size={14} />
            <span>Cut</span>
            <ContextMenuShortcut>⌘X</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleDuplicate}>
            <Files size={14} />
            <span>Duplicate</span>
            <ContextMenuShortcut>⌘D</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={handleToggleLock}>
            {clip.locked ? <Unlock size={14} /> : <Lock size={14} />}
            <span>{clip.locked ? 'Unlock' : 'Lock'}</span>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleToggleVisibility}>
            {clip.enabled ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{clip.enabled ? 'Hide' : 'Show'}</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onSelect={handleDelete}>
            <Trash2 size={14} />
            <span>Delete</span>
            <ContextMenuShortcut>⌫</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}
