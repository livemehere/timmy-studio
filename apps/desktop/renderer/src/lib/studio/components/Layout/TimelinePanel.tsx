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

  const timelinePanelRef = useRef<HTMLDivElement>(null);

  // Store actions for deleting clips
  const tracks = useDocStore((state) => state.tracks);
  const removeClip = useDocStore((state) => state.removeClip);
  const cloneClipToTrack = useDocStore((state) => state.cloneClipToTrack);
  const addClipToTrack = useDocStore((state) => state.addClipToTrack);
  const setActiveTrackId = useDocStore((state) => state.setActiveTrackId);
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);
  const setSelectedClipId = useInteractionStore(
    (state) => state.setSelectedClipId
  );
  const setSelectedClipIds = useInteractionStore(
    (state) => state.setSelectedClipIds
  );
  const clipboard = useInteractionStore((state) => state.clipboard);
  const setClipboard = useInteractionStore((state) => state.setClipboard);
  const lastClickedTime = useInteractionStore((state) => state.lastClickedTime);
  const activeTrackId = useDocStore((state) => state.activeTrackId);

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

  // Cmd/Ctrl + A로 모든 클립 선택 (TimelinePanel이 포커스되었을 때만)
  useHotkeys(
    'mod+a',
    (e) => {
      // TimelinePanel이 포커스되지 않았으면 무시
      if (
        !timelinePanelRef.current ||
        !timelinePanelRef.current.contains(document.activeElement)
      ) {
        return;
      }

      e.preventDefault();
      const allClipIds: string[] = [];
      tracks.forEach((track) => {
        track.clips.forEach((clip) => {
          allClipIds.push(clip.id);
        });
      });
      setSelectedClipIds(allClipIds);
      console.log('[TimelinePanel] Selected all clips:', allClipIds.length);
    },
    { enableOnFormTags: true }
  );

  // ESC로 모든 선택 해제
  useHotkeys('escape', () => {
    setSelectedClipIds([]);
    setActiveTrackId(null);
    console.log('[TimelinePanel] Cleared all selections');
  });

  // Cmd/Ctrl + C로 클립 복사
  useHotkeys('mod+c', (e) => {
    e.preventDefault();
    if (selectedClipIds.length !== 1) return; // 하나의 클립만 선택되었을 때

    const clipId = selectedClipIds[0];
    const trackWithClip = tracks.find((track) =>
      track.clips.some((clip) => clip.id === clipId)
    );

    if (trackWithClip) {
      const clip = trackWithClip.clips.find((c) => c.id === clipId);
      if (clip) {
        // 클립 전체 데이터를 복사 (deep clone)
        const clipData = JSON.parse(JSON.stringify(clip));
        setClipboard({
          clip: clipData,
          operation: 'copy',
        });
        console.log('[TimelinePanel] Copied clip data:', clipId);
      }
    }
  });

  // Cmd/Ctrl + X로 클립 잘라내기
  useHotkeys('mod+x', (e) => {
    e.preventDefault();
    if (selectedClipIds.length !== 1) return; // 하나의 클립만 선택되었을 때

    const clipId = selectedClipIds[0];
    const trackWithClip = tracks.find((track) =>
      track.clips.some((clip) => clip.id === clipId)
    );

    if (trackWithClip) {
      const clip = trackWithClip.clips.find((c) => c.id === clipId);
      if (clip) {
        // 클립 전체 데이터를 복사 (deep clone)
        const clipData = JSON.parse(JSON.stringify(clip));
        setClipboard({
          clip: clipData,
          operation: 'cut',
        });
        // Cut은 즉시 원본 삭제
        removeClip(trackWithClip.id, clipId);
        console.log('[TimelinePanel] Cut clip (removed):', clipId);
      }
    }
  });

  // Cmd/Ctrl + V로 클립 붙여넣기 (activeTrackId가 있을 때만, 트랙의 시작점에)
  useHotkeys('mod+v', (e) => {
    e.preventDefault();

    if (!clipboard || !activeTrackId) {
      console.log(
        '[TimelinePanel] Cannot paste: no clipboard or no active track'
      );
      return;
    }

    const sourceClip = clipboard.clip;
    const targetTrack = tracks.find((t) => t.id === activeTrackId);
    if (!targetTrack) {
      console.error('[TimelinePanel] Target track not found');
      return;
    }

    const duration = sourceClip.endTime - sourceClip.startTime;
    // lastClickedTime이 있으면 그 위치에, 없으면 0에 붙여넣기
    const newStartTime = lastClickedTime !== null ? lastClickedTime : 0;
    const newEndTime = newStartTime + duration;

    console.log('[TimelinePanel] Pasting at:', {
      lastClickedTime,
      newStartTime,
    });

    // 겹침 체크
    const hasOverlap = targetTrack.clips.some((clip) => {
      return !(newEndTime <= clip.startTime || newStartTime >= clip.endTime);
    });

    if (hasOverlap) {
      console.error('[TimelinePanel] Cannot paste: clip would overlap');
      alert('Cannot paste: clip would overlap with existing clip');
      return;
    }

    // 클립 데이터 복사 및 시간 수정
    const newClipData = {
      ...sourceClip,
      startTime: newStartTime,
      endTime: newEndTime,
    };

    // 트랙에 클립 추가
    addClipToTrack(activeTrackId, newClipData);
    console.log('[TimelinePanel] Pasted clip at time 0');

    // Cut이었으면 clipboard 클리어
    if (clipboard.operation === 'cut') {
      setClipboard(null);
    }
  });

  // Cmd/Ctrl + D로 선택된 클립을 endTime 위치에 복제
  useHotkeys('mod+d', (e) => {
    e.preventDefault();
    if (selectedClipIds.length === 0) return;

    const newClipIds: string[] = [];

    selectedClipIds.forEach((clipId) => {
      try {
        // 클립이 속한 트랙 찾기
        const trackWithClip = tracks.find((track) =>
          track.clips.some((clip) => clip.id === clipId)
        );

        if (!trackWithClip) {
          console.error('[TimelinePanel] Track not found for clip:', clipId);
          return;
        }

        const originalClip = trackWithClip.clips.find(
          (clip) => clip.id === clipId
        );

        if (!originalClip) return;

        const newStartTime = originalClip.endTime;
        const newEndTime =
          newStartTime + (originalClip.endTime - originalClip.startTime);

        // 같은 트랙에서 겹치는 클립이 있는지 확인
        const hasOverlap = trackWithClip.clips.some((clip) => {
          if (clip.id === clipId) return false; // 자기 자신 제외
          // 겹침 체크: 새 클립의 범위가 기존 클립과 겹치는지
          return !(
            newEndTime <= clip.startTime || newStartTime >= clip.endTime
          );
        });

        if (hasOverlap) {
          throw new Error(
            `Cannot duplicate clip: overlaps with existing clip on track ${trackWithClip.id}`
          );
        }

        // 복제 실행 (sourceTrackId, targetTrackId, clipId, newStartTime, newEndTime)
        const newClipId = cloneClipToTrack(
          trackWithClip.id,
          trackWithClip.id,
          clipId,
          newStartTime,
          newEndTime
        );

        if (newClipId) {
          newClipIds.push(newClipId);
          console.log('[TimelinePanel] Duplicated clip at endTime:', {
            originalClipId: clipId,
            newClipId,
            trackId: trackWithClip.id,
            startTime: newStartTime,
            endTime: newEndTime,
          });
        }
      } catch (error) {
        console.error('[TimelinePanel] Duplicate failed:', error);
      }
    });

    // 복제된 클립들만 선택
    if (newClipIds.length > 0) {
      setSelectedClipIds(newClipIds);
      console.log('[TimelinePanel] Selected new clipped clips:', newClipIds);
    }
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
      ref={(el) => {
        vScrollContainerRef.current = el;
        timelinePanelRef.current = el;
      }}
      className={'relative h-full overflow-y-scroll'}
      tabIndex={0}
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
