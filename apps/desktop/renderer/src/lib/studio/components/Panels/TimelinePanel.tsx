import { motion, useMotionValue, useScroll, useTransform } from 'motion/react';
import { ActionBar } from '@/lib/studio/components/ActionBar';
import { TimelineRulerCanvas } from '@/lib/studio/components/TimelineRulerCanvas';
import { TimelineTracks } from '@/lib/studio/domains/Timeline/TimelineTracks';
import {
  useDocStore,
  useEngineStore,
  useInteractionStore,
} from '../../hooks/useStudioStores';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import { Z_INDEX } from '../../constants/zIndex';

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

  // Store actions for deleting clips
  const tracks = useDocStore((state) => state.tracks);
  const removeClip = useDocStore((state) => state.removeClip);
  const cloneClipToTrack = useDocStore((state) => state.cloneClipToTrack);
  const addClipToTrack = useDocStore((state) => state.addClipToTrack);
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);
  const setSelectedClipId = useInteractionStore(
    (state) => state.setSelectedClipId
  );
  const setSelectedClipIds = useInteractionStore(
    (state) => state.setSelectedClipIds
  );
  const setActiveTrackId = useInteractionStore(
    (state) => state.setActiveTrackId
  );
  const clipboard = useInteractionStore((state) => state.clipboard);
  const setClipboard = useInteractionStore((state) => state.setClipboard);
  const lastClickedTime = useInteractionStore((state) => state.lastClickedTime);
  const activeTrackId = useInteractionStore((state) => state.activeTrackId);

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
  /** --- */

  /** zoom shortcut */
  useEffect(() => {
    const container = hScrollContainerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
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
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

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
    if (selectedClipIds.length === 0) return;

    // 선택된 모든 클립의 데이터 수집
    const clipDataArray: Array<{
      clip: any;
      trackId: string;
      startTime: number;
    }> = [];

    selectedClipIds.forEach((clipId) => {
      const trackWithClip = tracks.find((track) =>
        track.clips.some((clip) => clip.id === clipId)
      );

      if (trackWithClip) {
        const clip = trackWithClip.clips.find((c) => c.id === clipId);
        if (clip) {
          clipDataArray.push({
            clip: JSON.parse(JSON.stringify(clip)),
            trackId: trackWithClip.id,
            startTime: clip.startTime,
          });
        }
      }
    });

    if (clipDataArray.length === 0) return;

    // 가장 이른 startTime 찾기
    const minStartTime = Math.min(...clipDataArray.map((d) => d.startTime));

    // 상대 시간으로 변환
    const clipsWithRelativeTime = clipDataArray.map((d) => ({
      clip: d.clip,
      trackId: d.trackId,
      relativeStartTime: d.startTime - minStartTime,
    }));

    setClipboard({
      clips: clipsWithRelativeTime,
      operation: 'copy',
    });

    console.log('[TimelinePanel] Copied clips:', clipDataArray.length);
    toast.success(
      clipDataArray.length === 1
        ? 'Clip copied'
        : `${clipDataArray.length} clips copied`,
      { description: 'Press ⌘V to paste' }
    );
  });

  // Cmd/Ctrl + X로 클립 잘라내기
  useHotkeys('mod+x', (e) => {
    e.preventDefault();
    if (selectedClipIds.length === 0) return;

    // 선택된 모든 클립의 데이터 수집
    const clipDataArray: Array<{
      clip: any;
      trackId: string;
      startTime: number;
    }> = [];

    selectedClipIds.forEach((clipId) => {
      const trackWithClip = tracks.find((track) =>
        track.clips.some((clip) => clip.id === clipId)
      );

      if (trackWithClip) {
        const clip = trackWithClip.clips.find((c) => c.id === clipId);
        if (clip) {
          clipDataArray.push({
            clip: JSON.parse(JSON.stringify(clip)),
            trackId: trackWithClip.id,
            startTime: clip.startTime,
          });
        }
      }
    });

    if (clipDataArray.length === 0) return;

    // 가장 이른 startTime 찾기
    const minStartTime = Math.min(...clipDataArray.map((d) => d.startTime));

    // 상대 시간으로 변환
    const clipsWithRelativeTime = clipDataArray.map((d) => ({
      clip: d.clip,
      trackId: d.trackId,
      relativeStartTime: d.startTime - minStartTime,
    }));

    setClipboard({
      clips: clipsWithRelativeTime,
      operation: 'cut',
    });

    // Cut은 즉시 원본 삭제
    clipDataArray.forEach((d) => {
      removeClip(d.trackId, d.clip.id);
    });

    console.log('[TimelinePanel] Cut clips:', clipDataArray.length);
    toast.info(
      clipDataArray.length === 1
        ? 'Clip cut'
        : `${clipDataArray.length} clips cut`,
      { description: 'Press ⌘V to paste' }
    );
  });

  // Cmd/Ctrl + V로 클립 붙여넣기
  useHotkeys('mod+v', (e) => {
    e.preventDefault();

    if (!clipboard) {
      console.log('[TimelinePanel] Cannot paste: no clipboard');
      return;
    }

    // 붙여넣을 시작 위치
    const pasteStartTime = lastClickedTime !== null ? lastClickedTime : 0;

    // 단일 클립: activeTrack에 붙여넣기
    if (clipboard.clips.length === 1) {
      if (!activeTrackId) {
        console.log('[TimelinePanel] Cannot paste: no active track');
        return;
      }

      const targetTrack = tracks.find((t) => t.id === activeTrackId);
      if (!targetTrack) {
        console.error('[TimelinePanel] Target track not found');
        return;
      }

      const clipItem = clipboard.clips[0];
      const duration = clipItem.clip.endTime - clipItem.clip.startTime;
      const newStartTime = pasteStartTime;
      const newEndTime = newStartTime + duration;

      // 겹침 체크
      const hasOverlap = targetTrack.clips.some((existingClip) => {
        return !(
          newEndTime <= existingClip.startTime ||
          newStartTime >= existingClip.endTime
        );
      });

      if (hasOverlap) {
        console.error('[TimelinePanel] Cannot paste: clip would overlap');
        toast.error('Cannot paste', {
          description: 'Clip would overlap with existing clip',
        });
        return;
      }

      // 클립 붙여넣기
      addClipToTrack(activeTrackId, {
        ...clipItem.clip,
        startTime: newStartTime,
        endTime: newEndTime,
      });

      console.log('[TimelinePanel] Pasted clip at:', pasteStartTime);
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
          console.error('[TimelinePanel] Track not found:', newClip.trackId);
          toast.error('Cannot paste', {
            description: 'Original track not found',
          });
          return;
        }

        const hasOverlap = targetTrack.clips.some((existingClip) => {
          return !(
            newClip.newEndTime <= existingClip.startTime ||
            newClip.newStartTime >= existingClip.endTime
          );
        });

        if (hasOverlap) {
          console.error('[TimelinePanel] Cannot paste: clips would overlap');
          toast.error('Cannot paste', {
            description: 'Clips would overlap with existing clips',
          });
          return;
        }
      }

      // 모든 클립 붙여넣기 (각자의 트랙에)
      newClipsData.forEach((newClip) => {
        addClipToTrack(newClip.trackId, newClip.clipData);
      });

      console.log(
        '[TimelinePanel] Pasted clips:',
        clipboard.clips.length,
        'at',
        pasteStartTime
      );
      toast.success(`${clipboard.clips.length} clips pasted`);
    }

    // Cut이든 Copy든 clipboard는 유지 (여러 번 붙여넣기 가능)
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
