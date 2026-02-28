import { motion, useMotionValue, useScroll, useTransform } from 'motion/react';
import { ActionBar } from '@/lib/studio/components/ActionBar';
import { TimelineRulerCanvas } from '@/lib/studio/components/TimelineRulerCanvas';
import { TimelineTracks } from '@/lib/studio/domains/Timeline/TimelineTracks';
import { useDocStore, useEngineStore } from '../../hooks/useStudioStores';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Z_INDEX } from '../../constants/zIndex';
import { useTimelineHotkeys } from '../../hooks/useTimelineHotkeys';

/** sizes */
const ACTION_BAR_HEIGHT = 40;
const RULER_HEIGHT = 30;

const MIN_PIXELS_PER_SECOND = 2;
const MAX_PIXELS_PER_SECOND = 100;

const TRACK_LEFT_HEADER_WIDTH = 180;
const TRACK_HEIGHT = 60;

export function TimelinePanel() {
  const timelinePanelRef = useRef<HTMLDivElement>(null);

  const [pxPerSec, setPixPerSec] = useState(10);

  /** duration, total width */
  const { duration } = useDocStore((state) => state.settings);
  const totalTrackWidth = useMemo(() => {
    const durationSec = duration / 1000;
    return durationSec * pxPerSec;
  }, [duration, pxPerSec]);

  const tracks = useDocStore((state) => state.tracks);

  const totalTrackHeight = useMemo(
    () => tracks.length * TRACK_HEIGHT,
    [tracks.length]
  );

  /** current time */
  const timer = useEngineStore((state) => state.timer);
  const currentTimeMs = useMotionValue(timer?.currentMs ?? 0);
  useEffect(() => {
    if (!timer) return;
    const unsub = timer.subscribe(({ currentMs }) => {
      currentTimeMs.set(currentMs);
    });
    return () => {
      unsub();
    };
  }, [timer]);

  const hScrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollX } = useScroll({
    container: hScrollContainerRef,
  });
  const currentTimeX = useTransform(() => {
    return `${(currentTimeMs.get() / 1000) * pxPerSec - scrollX.get()}px`;
  });
  const indicatorVisibility = useTransform(currentTimeX, (x) => {
    const numericX = parseFloat(x);
    return numericX >= 0 ? 'visible' : 'hidden';
  });

  /** zoom (Cmd/Ctrl + wheel) */
  useEffect(() => {
    const container = hScrollContainerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      const delta = -e.deltaY;
      setPixPerSec((prev) =>
        Math.max(
          MIN_PIXELS_PER_SECOND,
          Math.min(MAX_PIXELS_PER_SECOND, prev + delta * 0.1)
        )
      );
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  /** keyboard shortcuts */
  useTimelineHotkeys(timelinePanelRef);

  return (
    <div
      id="timeline"
      ref={timelinePanelRef}
      className="relative h-full overflow-y-scroll overflow-x-hidden bg-neutral-900/50"
    >
      <div
        id="timeline-header"
        className="sticky top-0 bg-neutral-900 "
        style={{
          zIndex: Z_INDEX.timeline.header,
        }}
      >
        {/* 현재시간 인디케이터 */}
        <motion.div
          id="current-time-indicator"
          className="w-px bg-red-500 absolute"
          style={{
            left: currentTimeX,
            marginLeft: TRACK_LEFT_HEADER_WIDTH,
            top: ACTION_BAR_HEIGHT,
            height: totalTrackHeight + RULER_HEIGHT,
            pointerEvents: 'none',
            zIndex: Z_INDEX.timeline.playhead,
            visibility: indicatorVisibility, // 화면 밖으로 나가면 숨김
          }}
        >
          {/* 플레이헤드 삼각형 */}
          <div className="absolute top-0 -left-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-8 border-t-red-500" />
        </motion.div>

        <ActionBar height={ACTION_BAR_HEIGHT} />
        <TimelineRulerCanvas
          leftPadding={TRACK_LEFT_HEADER_WIDTH}
          scrollXMotionValue={scrollX}
          pixelPerSecond={pxPerSec}
          height={RULER_HEIGHT}
        />
      </div>

      <div
        id="timeline-hscroll-container"
        ref={hScrollContainerRef}
        className="w-full overflow-x-scroll"
      >
        <TimelineTracks
          width={totalTrackWidth + TRACK_LEFT_HEADER_WIDTH}
          trackHeaderWidth={TRACK_LEFT_HEADER_WIDTH}
          trackHeight={TRACK_HEIGHT}
          pxPerSec={pxPerSec}
        />
      </div>
    </div>
  );
}
