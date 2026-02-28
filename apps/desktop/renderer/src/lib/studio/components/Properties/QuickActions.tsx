import { useCallback, useMemo } from 'react';
import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import { Track } from '../../domains/Track/Track';
import type { IGraphicClip, IClip } from '../../domains/Clip/types';
import type { ITrack } from '../../domains/Track/types';
import { Button } from '@/components/ui/button';
import { AlignCenter, Merge, GalleryHorizontalEnd } from 'lucide-react';

/**
 * QuickActions — 선택된 여러 클립에 동시에 적용 가능한 편의 기능 모음
 */
export function QuickActions() {
  const selectedClipIds = useInteractionStore((s) => s.selectedClipIds);
  const tracks = useDocStore((s) => s.tracks);
  const settings = useDocStore((s) => s.settings);
  const batch = useDocStore((s) => s.batch);

  const canvasWidth = settings.width;
  const canvasHeight = settings.height;

  // 선택된 클립 중 transform 이 있는 GraphicClip 만 추출
  const graphicClips = useMemo(() => {
    const result: Array<{ trackId: string; clip: IGraphicClip }> = [];
    for (const clipId of selectedClipIds) {
      const found = Track.findClip(tracks, clipId);
      if (!found) continue;
      if (found.clip.type === 'audio') continue; // audio 는 transform 없음
      result.push({
        trackId: found.trackId,
        clip: found.clip as IGraphicClip,
      });
    }
    return result;
  }, [selectedClipIds, tracks]);

  const hasGraphicClips = graphicClips.length > 0;

  // 선택된 모든 클립 (타입 무관) + 소속 트랙 정보
  const allSelectedClips = useMemo(() => {
    const result: Array<{ trackId: string; clip: IClip }> = [];
    for (const clipId of selectedClipIds) {
      const found = Track.findClip(tracks, clipId);
      if (!found) continue;
      result.push({ trackId: found.trackId, clip: found.clip });
    }
    return result;
  }, [selectedClipIds, tracks]);

  // 여러 트랙에 걸쳐있는지 확인
  const spanMultipleTracks = useMemo(() => {
    const trackSet = new Set(allSelectedClips.map((c) => c.trackId));
    return trackSet.size > 1;
  }, [allSelectedClips]);

  // ── Fit Width + Center ──
  const handleCenterAll = useCallback(() => {
    if (graphicClips.length === 0) return;

    batch((draft) => {
      for (const { trackId, clip } of graphicClips) {
        const draftTrack = draft.tracks.find((t) => t.id === trackId);
        if (!draftTrack) continue;

        const draftClip = draftTrack.clips.find((c) => c.id === clip.id) as
          | IGraphicClip
          | undefined;
        if (!draftClip || !draftClip.transforms) continue;

        const t = draftClip.transforms;

        // Fit-width: 캔버스 너비에 맞춰 균일 스케일
        const scale = canvasWidth / t.size.width;
        const renderedW = t.size.width * scale;
        const renderedH = t.size.height * scale;

        draftClip.transforms = {
          ...t,
          scaleX: scale,
          scaleY: scale,
          position: {
            x: (canvasWidth - renderedW) / 2,
            y: (canvasHeight - renderedH) / 2,
          },
        };
      }
    });
  }, [graphicClips, batch, canvasWidth, canvasHeight]);

  // ── Merge to One Track ──
  // 선택된 클립이 여러 트랙에 산재해 있을 때, 첫 번째 트랙으로 모두 이동하고
  // 시간순 정렬 뒤 겹치지 않게 순차 배치
  const handleMergeToTrack = useCallback(() => {
    if (allSelectedClips.length < 2) return;

    // 타입별로 분리 (graphic / audio 는 서로 다른 트랙 타입이라 섞을 수 없음)
    const byType = new Map<string, typeof allSelectedClips>();
    for (const item of allSelectedClips) {
      const trackType =
        tracks.find((t) => t.id === item.trackId)?.type ?? 'graphic';
      if (!byType.has(trackType)) byType.set(trackType, []);
      byType.get(trackType)!.push(item);
    }

    batch((draft) => {
      for (const [, items] of byType) {
        if (items.length < 2) continue;

        // 첫 번째 클립이 속한 트랙을 타겟으로 사용
        const targetTrackId = items[0].trackId;
        const targetTrack = draft.tracks.find((t) => t.id === targetTrackId) as
          | ITrack
          | undefined;
        if (!targetTrack) continue;

        // 시간순 정렬
        const sorted = [...items].sort(
          (a, b) => a.clip.startTime - b.clip.startTime
        );

        // 같은 트랙이 아닌 클립을 타겟 트랙으로 이동
        for (const { trackId, clip } of sorted) {
          if (trackId === targetTrackId) continue;
          const srcTrack = draft.tracks.find((t) => t.id === trackId) as
            | ITrack
            | undefined;
          if (!srcTrack) continue;

          const idx = (srcTrack.clips as IClip[]).findIndex(
            (c) => c.id === clip.id
          );
          if (idx === -1) continue;

          const [removed] = (srcTrack.clips as IClip[]).splice(idx, 1);
          (targetTrack.clips as IClip[]).push(removed);
        }

        // 이동 후 순차 배치 (겹침 방지)
        const targetClips = (targetTrack.clips as IClip[]).filter((c) =>
          sorted.some((s) => s.clip.id === c.id)
        );
        targetClips.sort((a, b) => a.startTime - b.startTime);

        let cursor = targetClips[0]?.startTime ?? 0;
        for (const tc of targetClips) {
          const duration = tc.endTime - tc.startTime;
          tc.startTime = cursor;
          tc.endTime = cursor + duration;
          cursor += duration;
        }
      }
    });
  }, [allSelectedClips, tracks, batch]);

  // ── Close Gaps ──
  // 선택된 클립들 사이의 간격을 0으로 만들어 딱 붙게 함
  // 트랙과 무관하게 시간순 정렬 → 앞 클립 endTime = 뒤 클립 startTime
  const handleCloseGaps = useCallback(() => {
    if (allSelectedClips.length < 2) return;

    // 시간순 정렬
    const sorted = [...allSelectedClips].sort(
      (a, b) => a.clip.startTime - b.clip.startTime
    );

    batch((draft) => {
      let cursor = sorted[0].clip.startTime; // 첫 클립의 시작 시간 유지

      for (const { trackId, clip } of sorted) {
        const draftTrack = draft.tracks.find((t) => t.id === trackId);
        if (!draftTrack) continue;

        const draftClip = (draftTrack.clips as IClip[]).find(
          (c) => c.id === clip.id
        );
        if (!draftClip) continue;

        const duration = draftClip.endTime - draftClip.startTime;
        draftClip.startTime = cursor;
        draftClip.endTime = cursor + duration;
        cursor += duration;
      }
    });
  }, [allSelectedClips, batch]);

  // 선택이 1개 이하면 표시하지 않음
  if (selectedClipIds.length < 2) return null;

  return (
    <div className="border-t border-neutral-800 px-3 py-3 space-y-2">
      <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
        Quick Actions
        <span className="ml-1.5 text-neutral-600">
          ({selectedClipIds.length} clips)
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 h-7"
          disabled={!hasGraphicClips}
          onClick={handleCenterAll}
          title="Fit Width + 캔버스 중앙 정렬"
        >
          <AlignCenter size={13} />
          Fit &amp; Center All
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 h-7"
          disabled={!spanMultipleTracks}
          onClick={handleMergeToTrack}
          title="여러 트랙에 흩어진 클립을 하나의 트랙으로 모아 순차 배치"
        >
          <Merge size={13} />
          Merge to Track
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 h-7"
          disabled={allSelectedClips.length < 2}
          onClick={handleCloseGaps}
          title="선택된 클립 사이의 빈 간격을 제거하여 연속 배치"
        >
          <GalleryHorizontalEnd size={13} />
          Close Gaps
        </Button>
      </div>
    </div>
  );
}
