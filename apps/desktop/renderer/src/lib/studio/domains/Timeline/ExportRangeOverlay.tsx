import { motion, useMotionValue } from 'motion/react';
import { useInteractionStore } from '../../hooks/useStudioStores';
import { msToSec } from '../../utils/time';
import { Z_INDEX } from '../../constants/zIndex';
import { useEffect } from 'react';

export function ExportRangeOverlay({ pxPerSec }: { pxPerSec: number }) {
  const exportPreviewRange = useInteractionStore(
    (state) => state.exportPreviewRange
  );
  const leftOverlayWidth = useMotionValue(0);
  const rightOverlayLeft = useMotionValue(0);
  const rangeOverlayLeft = useMotionValue(0);
  const rangeOverlayWidth = useMotionValue(0);

  useEffect(() => {
    if (!exportPreviewRange) {
      leftOverlayWidth.set(0);
      rightOverlayLeft.set(0);
      rangeOverlayLeft.set(0);
      rangeOverlayWidth.set(0);
      return;
    }

    const startLeft = msToSec(exportPreviewRange.start) * pxPerSec;
    const endLeft = msToSec(exportPreviewRange.end) * pxPerSec;
    const width = Math.max(0, endLeft - startLeft);

    leftOverlayWidth.set(Math.max(0, startLeft));
    rightOverlayLeft.set(Math.max(0, endLeft));
    rangeOverlayLeft.set(Math.max(0, startLeft));
    rangeOverlayWidth.set(width);
  }, [
    exportPreviewRange,
    pxPerSec,
    leftOverlayWidth,
    rightOverlayLeft,
    rangeOverlayLeft,
    rangeOverlayWidth,
  ]);

  if (!exportPreviewRange) {
    return null;
  }

  return (
    <>
      <motion.div
        className="absolute top-0 bottom-0 bg-black/60 pointer-events-none"
        style={{
          left: 0,
          width: leftOverlayWidth,
          zIndex: Z_INDEX.timeline.overlay,
        }}
      />
      <motion.div
        className="absolute top-0 bottom-0 bg-black/60 pointer-events-none"
        style={{
          left: rightOverlayLeft,
          right: 0,
          zIndex: Z_INDEX.timeline.overlay,
        }}
      />
      <motion.div
        className="absolute top-0 bottom-0 border-x-2 border-emerald-500/80 pointer-events-none"
        style={{
          left: rangeOverlayLeft,
          width: rangeOverlayWidth,
          zIndex: Z_INDEX.timeline.overlay,
        }}
      >
        <div className="absolute -top-6 left-0 right-0 flex justify-between px-1">
          <span className="text-[10px] font-mono text-emerald-400 bg-neutral-900/90 px-1 rounded">
            Export Start
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-neutral-900/90 px-1 rounded">
            Export End
          </span>
        </div>
      </motion.div>
    </>
  );
}
