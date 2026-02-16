import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import { TimelineTrack } from '@/lib/studio/domains/Timeline/TimelineTrack';
import { Z_INDEX } from '../../constants/zIndex';
import { ExportRangeOverlay } from './ExportRangeOverlay';
import { motion, useMotionValue } from 'motion/react';
import { useSelection } from '../../hooks/useSelection';

export function TimelineTracks({
  width,
  trackHeaderWidth,
  trackHeight,
  pxPerSec,
}: {
  width: number;
  trackHeaderWidth: number;
  trackHeight: number;
  pxPerSec: number;
}) {
  const tracks = useDocStore((state) => state.tracks);
  const setSelectedClipIds = useInteractionStore(
    (state) => state.setSelectedClipIds
  );

  const selectionTop = useMotionValue(0);
  const selectionLeft = useMotionValue(0);
  const selectionWidth = useMotionValue(0);
  const selectionHeight = useMotionValue(0);

  const { ref, isDragging } = useSelection({
    target: 'data-clip-id',
    onRangeUpdate: (range) => {
      if (!range) {
        selectionTop.set(0);
        selectionLeft.set(0);
        selectionWidth.set(0);
        selectionHeight.set(0);
        return;
      }

      selectionTop.set(range.minY);
      selectionLeft.set(range.minX);
      selectionWidth.set(range.width);
      selectionHeight.set(range.height);
    },
    onSelectionChange: (targets) => {
      setSelectedClipIds(targets.map((t) => t.value));
    },
  });

  // tracks는 이미 docStore에서 zIndex 기반 정렬됨
  return (
    <div
      id="timeline-tracks"
      ref={ref}
      className="relative border-blue-400 border"
      style={{
        width,
      }}
    >
      {/* Export Range Overlay */}
      <ExportRangeOverlay pxPerSec={pxPerSec} />

      {tracks.map((track) => (
        <TimelineTrack
          key={track.id}
          trackId={track.id}
          headerWidth={trackHeaderWidth}
          trackHeight={trackHeight}
          pxPerSec={pxPerSec}
        />
      ))}

      {/* 선택 영역 사각형 */}
      {isDragging && (
        <motion.div
          className="absolute border border-white/50 bg-black/50 pointer-none"
          style={{
            top: selectionTop,
            left: selectionLeft,
            width: selectionWidth,
            height: selectionHeight,
            zIndex: Z_INDEX.timeline.selectionRect,
          }}
        />
      )}
    </div>
  );
}
