import { useCallback, useMemo } from 'react';
import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import { Track } from '../../domains/Track/Track';
import { Clip } from '../../domains/Clip/Clip';
import type { IGraphicClip, IClip, ITextClip } from '../../domains/Clip/types';
import type { ITrack, IGraphicTrack } from '../../domains/Track/types';
import type { IMediaAsset } from '../../domains/Asset/types';
import { Button } from '@/components/ui/button';
import {
  AlignCenter,
  Merge,
  GalleryHorizontalEnd,
  FileText,
} from 'lucide-react';

/**
 * QuickActions — 선택된 여러 클립에 동시에 적용 가능한 편의 기능 모음
 */
export function QuickActions() {
  const selectedClipIds = useInteractionStore((s) => s.selectedClipIds);
  const tracks = useDocStore((s) => s.tracks);
  const assets = useDocStore((s) => s.assets);
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

  // ── Generate Info Text ──
  // 선택된 클립(미디어 에셋 보유)마다 생성시간(KST), 장소 텍스트 클립 2개 생성
  // 새로운 트랙 2개 (시간용 / 장소용) 에 배치, 소스 클립 duration 과 동일
  const clipsWithAsset = useMemo(() => {
    const result: Array<{
      clip: IClip;
      asset: IMediaAsset;
    }> = [];
    for (const { clip } of allSelectedClips) {
      if (!('assetId' in clip)) continue;
      const assetId = (clip as { assetId: string }).assetId;
      const asset = assets.find((a) => a.id === assetId);
      if (!asset || !('metadata' in asset) || !('filePath' in asset)) continue;
      result.push({ clip, asset: asset as IMediaAsset });
    }
    return result;
  }, [allSelectedClips, assets]);

  const handleGenerateInfoText = useCallback(() => {
    if (clipsWithAsset.length === 0) return;

    const FONT_SIZE = 28;
    const PADDING_BOTTOM = 50;
    const LINE_GAP = 8;

    /**
     * ISO 6709 좌표를 사람이 읽을 수 있는 형태로 변환
     * e.g. "+37.5665+126.9780+013.800/" → "37.5665°N 126.9780°E"
     */
    const formatLocation = (raw: string): string => {
      // ISO 6709: +DD.DDDD+DDD.DDDD(+AAA.AAA)/ 형식
      const m = raw.match(/([+-]\d+\.?\d*)\s*([+-]\d+\.?\d*)/);
      if (!m) return raw.replace(/\/$/, '');

      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);

      const latDir = lat >= 0 ? 'N' : 'S';
      const lngDir = lng >= 0 ? 'E' : 'W';

      return `${Math.abs(lat).toFixed(4)}°${latDir} ${Math.abs(lng).toFixed(4)}°${lngDir}`;
    };

    /** createdAt → KST 포맷 */
    const formatKST = (dateStr: string): string => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    };

    batch((draft) => {
      // 새 트랙 2개 생성 (시간용, 장소용)
      const timeTrack = Track.create(
        'graphic',
        Track.getNextTrackZIndex(draft.tracks, 'graphic')
      ) as IGraphicTrack;
      timeTrack.name = 'Info-Time';

      const locTrack = Track.create(
        'graphic',
        Track.getNextTrackZIndex([...draft.tracks, timeTrack], 'graphic')
      ) as IGraphicTrack;
      locTrack.name = 'Info-Location';

      for (const { clip, asset } of clipsWithAsset) {
        const meta = asset.metadata;
        const duration = clip.endTime - clip.startTime;

        // 1) 생성시간 텍스트 클립
        const timeStr = meta.createdAt
          ? formatKST(meta.createdAt)
          : '시간 정보 없음';

        const timeClip = Clip.createText({
          content: timeStr,
          fontSize: FONT_SIZE,
          fontFamily: 'Pretendard, sans-serif',
          color: '#ffffff',
          align: 'center',
          shadow: {
            color: '#000000',
            blur: 4,
            offsetX: 1,
            offsetY: 1,
            alpha: 0.7,
          },
        }) as ITextClip;

        // 소스 클립과 동일한 시간 범위
        timeClip.startTime = clip.startTime;
        timeClip.endTime = clip.startTime + duration;
        timeClip.name = `Time: ${timeStr.substring(0, 12)}`;

        // 캔버스 하단 2번째 줄에 중앙 배치
        const timeTextHeight = FONT_SIZE * 1.2;
        timeClip.transforms.position = {
          x: canvasWidth / 2 - timeClip.transforms.size.width / 2,
          y: canvasHeight - PADDING_BOTTOM - timeTextHeight * 2 - LINE_GAP,
        };

        (timeTrack.clips as IClip[]).push(timeClip);

        // 2) 장소 텍스트 클립
        const locStr = meta.location
          ? formatLocation(meta.location)
          : '위치 정보 없음';

        const locClip = Clip.createText({
          content: locStr,
          fontSize: FONT_SIZE,
          fontFamily: 'Pretendard, sans-serif',
          color: '#ffffff',
          align: 'center',
          shadow: {
            color: '#000000',
            blur: 4,
            offsetX: 1,
            offsetY: 1,
            alpha: 0.7,
          },
        }) as ITextClip;

        locClip.startTime = clip.startTime;
        locClip.endTime = clip.startTime + duration;
        locClip.name = `Loc: ${locStr.substring(0, 12)}`;

        // 캔버스 하단 1번째 줄에 중앙 배치
        const locTextHeight = FONT_SIZE * 1.2;
        locClip.transforms.position = {
          x: canvasWidth / 2 - locClip.transforms.size.width / 2,
          y: canvasHeight - PADDING_BOTTOM - locTextHeight,
        };

        (locTrack.clips as IClip[]).push(locClip);
      }

      // 클립이 생성되었을 때만 트랙 추가
      if (timeTrack.clips.length > 0) {
        draft.tracks.push(timeTrack);
      }
      if (locTrack.clips.length > 0) {
        draft.tracks.push(locTrack);
      }
    });
  }, [clipsWithAsset, batch, canvasWidth, canvasHeight]);

  // 선택 없으면 표시하지 않음
  if (selectedClipIds.length === 0) return null;

  const isMulti = selectedClipIds.length >= 2;

  return (
    <div className="border-t border-neutral-800 px-3 py-3 space-y-2">
      <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
        Quick Actions
        <span className="ml-1.5 text-neutral-600">
          ({selectedClipIds.length} clips)
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {isMulti && (
          <>
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
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 h-7"
          disabled={clipsWithAsset.length === 0}
          onClick={handleGenerateInfoText}
          title="각 클립의 생성시간(KST)과 장소를 텍스트 클립으로 생성"
        >
          <FileText size={13} />
          Generate Info
        </Button>
      </div>
    </div>
  );
}
