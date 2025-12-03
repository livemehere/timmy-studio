import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { PreviewRenderer } from '@renderer/lib/studio/components/PreviewRenderer';
import { TimerActionBar } from '@renderer/lib/studio/components/TimerActionBar';
import { ActionBar } from '@renderer/lib/studio/components/ActionBar';
import { TimelineRulerCanvas } from '@renderer/lib/studio/components/TimelineRulerCanvas';
import { TimelineTracks } from '@renderer/lib/studio/components/Timeline/TimelineTracks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useScroll, useTransform } from 'motion/react';
import { useDocSettings, useEngineTimer } from '@renderer/lib/studio/hooks';

const MIN_PIXELS_PER_SECOND = 2;
const MAX_PIXELS_PER_SECOND = 100;

export function StudioApp() {
  const { duration } = useDocSettings();
  const totalTrackHeight = 2200;

  const trackTitleWidth = 120;
  const trackHeight = 60;

  const [pxPerSec, setPixPerSec] = useState(10);

  // duration(ms)과 pxPerSec에 따라 totalTrackWidth 계산
  const totalTrackWidth = useMemo(() => {
    const durationSec = duration / 1000;
    return durationSec * pxPerSec;
  }, [duration, pxPerSec]);

  const timer = useEngineTimer();
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
  const vScrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollX } = useScroll({
    container: hScrollContainerRef,
  });

  const currentTimeLeft = useTransform(() => {
    return `${(currentTimeMs.get() / 1000) * pxPerSec - scrollX.get()}px`;
  });

  useEffect(() => {
    const el = hScrollContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const isMetaKeyPressed = e.metaKey || e.ctrlKey;
      if (isMetaKeyPressed) {
        e.preventDefault();
        const delta = -e.deltaY; // 마우스 휠의 수직 이동량을 반전시킴
        setPixPerSec((prev) => {
          let newPxPerSec = prev + delta * 0.1; // 확대/축소 속도 조절
          newPxPerSec = Math.max(
            MIN_PIXELS_PER_SECOND,
            Math.min(MAX_PIXELS_PER_SECOND, newPxPerSec)
          );
          return newPxPerSec;
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="h-full p-2 overflow-hidden">
      <PanelGroup direction={'vertical'}>
        <Panel>
          <PanelGroup direction={'horizontal'}>
            <Panel className={'bg-neutral-900'} defaultSize={30}>
              Resources
            </Panel>
            <PanelResizeHandle className={'w-1 bg-neutral-950'} />
            <Panel className={'bg-neutral-900'}>
              <PreviewRenderer />
              <TimerActionBar />
            </Panel>
            <PanelResizeHandle className={'w-1 bg-neutral-950'} />
            <Panel className={'bg-neutral-900'} defaultSize={25}>
              Properties
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className={'h-1 bg-neutral-950'} />
        <Panel className={'bg-neutral-900'} defaultSize={40}>
          <div
            ref={vScrollContainerRef}
            className={'relative h-full overflow-y-scroll'}
          >
            {/* 현재시간 */}
            <motion.div
              className={'w-0.5 bg-white/50 absolute top-0 z-30'}
              style={{
                left: currentTimeLeft,
                marginLeft: trackTitleWidth,
                height: totalTrackHeight,
              }}
            />

            <div className={'sticky top-0 z-30 bg-neutral-900'}>
              <ActionBar />
              <TimelineRulerCanvas
                leftPadding={trackTitleWidth}
                scrollXMotionValue={scrollX}
                pixelPerSecond={pxPerSec}
              />
            </div>

            <div
              ref={hScrollContainerRef}
              className={'w-full overflow-x-scroll'}
            >
              <TimelineTracks
                width={totalTrackWidth + trackTitleWidth}
                height={totalTrackHeight}
                trackTitleWidth={trackTitleWidth}
                trackHeight={trackHeight}
                pxPerSec={pxPerSec}
              />
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
