import { useInteractionStore } from '../../hooks/useStudioStores';
import { Z_INDEX } from '../../constants/zIndex';
import { motion, useMotionValue } from 'motion/react';
import { useSelection } from '../../hooks/useSelection';
export function ClipSelection({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const setSelectedClipIds = useInteractionStore(
    (state) => state.setSelectedClipIds
  );

  const selectionTop = useMotionValue(0);
  const selectionLeft = useMotionValue(0);
  const selectionWidth = useMotionValue(0);
  const selectionHeight = useMotionValue(0);

  const { isDragging } = useSelection({
    container: containerRef,
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
      console.log('Selected targets:', targets);
      setSelectedClipIds(targets.map((t) => t.value));
    },
  });

  if (!isDragging) {
    return null;
  }
  return (
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
  );
}
