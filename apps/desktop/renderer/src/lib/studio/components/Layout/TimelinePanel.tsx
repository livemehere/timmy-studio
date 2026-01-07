import { motion, useMotionValue, useScroll, useTransform } from 'motion/react';
import { ActionBar } from '@renderer/lib/studio/components/ActionBar';
import { TimelineRulerCanvas } from '@renderer/lib/studio/components/TimelineRulerCanvas';
import { TimelineTracks } from '@renderer/lib/studio/components/Timeline/TimelineTracks';
import {
  useDocStore,
  useEngineStore,
  useInteractionStore,
} from '../../hooks/useStudioStores';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

const MIN_PIXELS_PER_SECOND = 2;
const MAX_PIXELS_PER_SECOND = 100;

export function TimelinePanel() {
  const { duration } = useDocStore((state) => state.settings);
  const totalTrackHeight = 2200;

  const trackTitleWidth = 120;
  const trackHeight = 60;

  const [pxPerSec, setPixPerSec] = useState(10);

  // Store actions for deleting clips
  const tracks = useDocStore((state) => state.tracks);
  const removeClip = useDocStore((state) => state.removeClip);
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);
  const setSelectedClipId = useInteractionStore(
    (state) => state.setSelectedClipId
  );

  // Backspace 또는 Delete 키로 선택된 클립 삭제
  useHotkeys('backspace, delete', () => {
    if (selectedClipIds.length === 0) return;

    console.log('[TimelinePanel] Deleting selected clips:', selectedClipIds);

    // 각 선택된 클립을 찾아서 삭제
    selectedClipIds.forEach((clipId) => {
      // 클립이 속한 트랙 찾기
      const trackWithClip = tracks.find((track) =>
        track.clips.some((clip) => clip.id === clipId)
      );

      if (trackWithClip) {
        removeClip(trackWithClip.id, clipId);
        console.log('[TimelinePanel] Deleted clip:', {
          clipId,
          trackId: trackWithClip.id,
        });
      }
    });

    // 선택 해제
    setSelectedClipId(null);
  });

  // duration(ms)과 pxPerSec에 따라 totalTrackWidth 계산
  const totalTrackWidth = useMemo(() => {
    const durationSec = duration / 1000;
    return durationSec * pxPerSec;
  }, [duration, pxPerSec]);

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
          pointerEvents: 'none',
        }}
      />

      <div className={'sticky top-0 z-60 bg-neutral-900'}>
        <ActionBar />
        <TimelineRulerCanvas
          leftPadding={trackTitleWidth}
          scrollXMotionValue={scrollX}
          pixelPerSecond={pxPerSec}
        />
      </div>

      <div ref={hScrollContainerRef} className={'w-full overflow-x-scroll'}>
        <TimelineTracks
          width={totalTrackWidth + trackTitleWidth}
          height={totalTrackHeight}
          trackTitleWidth={trackTitleWidth}
          trackHeight={trackHeight}
          pxPerSec={pxPerSec}
        />
      </div>
    </div>
  );
}
