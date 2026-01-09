import type { IAsset } from '@/lib/studio/domains/Asset/types';
import {
  useDocStore,
  useStudioStores,
  useEngineStore,
} from '@/lib/studio/hooks/useStudioStores';
import { useMemo } from 'react';

import { Asset } from '@/lib/studio/domains/Asset/Asset';
import { Clip } from '@/lib/studio/domains/Clip/Clip';
import { GraphicClip } from '@/lib/studio/domains/Clip/GraphicClip';
import { GraphicTrack } from '@/lib/studio/domains/Track/GraphicTrack';
import type { ITrack } from '../../Track/types';
import { Track } from '@/lib/studio/domains/Track/Track';

/**
 * 트랙의 클립들과 시간 범위가 겹치는지 확인
 */
function hasTimeOverlap(
  track: ITrack,
  startTime: number,
  endTime: number
): boolean {
  return track.clips.some((clip) => {
    const clipStart = clip.startTime;
    const clipEnd = clip.endTime;
    // 겹침 조건: !(새클립이 기존클립 완전히 앞 OR 완전히 뒤)
    return !(endTime <= clipStart || startTime >= clipEnd);
  });
}

export function useAsset(asset: IAsset) {
  const { docStore } = useStudioStores();
  const addTrackToDoc = useDocStore((state) => state.addTrack);
  const addClipToDoc = useDocStore((state) => state.addClip);
  const tracks = useDocStore((state) => state.tracks);
  const settings = useDocStore((state) => state.settings);
  const timer = useEngineStore((state) => state.timer);
  const activeTrackId = useDocStore((state) => state.activeTrackId);

  const status = useMemo(() => {
    return Asset.getStatus(asset);
  }, [asset]);

  const firstTrackId = useMemo(() => {
    const trackType = GraphicTrack.AssetTypeToTrackType(asset.type);
    const existTrack = GraphicTrack.findFirstTrack(tracks, trackType);
    return existTrack?.id;
  }, [asset.type, tracks]);

  const addClip = async (
    options: {
      // trackId가 있으면: 활성 트랙의 현재 타이머 위치에 배치 (Plus 버튼)
      // trackId가 없으면: 새 트랙 생성 후 startTime 0에 배치 (Layers 버튼)
      trackId?: string;

      /** 비디오/이미지 에셋에 기본 placement preset 적용 */
      placementPresetKey?: keyof typeof GraphicClip.ASSET_PLACEMENT_PRESETS;
    } = {}
  ) => {
    if (!status.isReady) {
      throw new Error('에셋이 준비되지 않았습니다.');
    }

    const clip = Clip.createFromAsset(asset);

    // renderer 에 들어가는 clip 은 transform 정렬을 처리함.
    if (clip.type !== 'audio' && options.placementPresetKey) {
      const preset =
        GraphicClip.ASSET_PLACEMENT_PRESETS[options.placementPresetKey];
      const computed = GraphicClip.computePlacement({
        total: { width: settings.width, height: settings.height },
        target: {
          width: clip.transforms.size!.width,
          height: clip.transforms.size!.height,
        },
        preset,
      });
      clip.transforms.position = computed.position;
      clip.transforms.size = computed.size;
    }

    // duration 계산 (startTime 변경 전에 계산)
    const duration = clip.endTime - clip.startTime;

    let targetTrack: ITrack;
    let newStartTime: number;

    if (options.trackId) {
      // ========== Plus 버튼: 활성 트랙의 현재 타이머 위치에 배치 ==========
      const currentTime = timer?.currentMs ?? 0;
      newStartTime = currentTime;
      const newEndTime = newStartTime + duration;

      console.log(
        '[useAsset] Plus button mode - Place at active track cursor:',
        {
          assetName: asset.name,
          currentTime,
          duration,
          proposedTiming: { start: newStartTime, end: newEndTime },
          activeTrackId,
        }
      );

      const trackType = GraphicTrack.AssetTypeToTrackType(asset.type);
      const sameTypeTracks = tracks.filter((t) => t.type === trackType);

      // 활성 트랙이 있고 같은 타입이면 우선 시도
      let searchOrder: ITrack[] = [];
      if (activeTrackId) {
        const activeTrack = sameTypeTracks.find((t) => t.id === activeTrackId);
        if (activeTrack) {
          // 활성 트랙을 첫 번째로, 나머지는 순서대로
          searchOrder = [
            activeTrack,
            ...sameTypeTracks.filter((t) => t.id !== activeTrackId),
          ];
          console.log('[useAsset] Active track found, searching in order:', {
            activeTrackId,
            searchOrder: searchOrder.map((t) => t.id),
          });
        } else {
          // 활성 트랙이 다른 타입이면 모든 같은 타입 트랙 검색
          searchOrder = sameTypeTracks;
          console.log(
            '[useAsset] Active track is different type, searching all same-type tracks'
          );
        }
      } else {
        // 활성 트랙 없으면 모든 같은 타입 트랙 검색
        searchOrder = sameTypeTracks;
        console.log(
          '[useAsset] No active track, searching all same-type tracks'
        );
      }

      // 겹치지 않는 트랙 찾기
      let foundTrack: ITrack | undefined;
      for (const track of searchOrder) {
        const latestTrack = docStore.getState().getTrackById(track.id)!;
        const hasOverlap = hasTimeOverlap(
          latestTrack,
          newStartTime,
          newEndTime
        );

        if (!hasOverlap) {
          foundTrack = latestTrack;
          console.log('[useAsset] Found available track without overlap:', {
            trackId: track.id,
          });
          break;
        }
      }

      if (foundTrack) {
        // 겹치지 않는 트랙 발견
        targetTrack = foundTrack;
      } else {
        // 모든 트랙이 겹침 → 새 트랙 생성
        console.log(
          '[useAsset] All existing tracks have overlap, creating new track'
        );
        targetTrack = Track.create(trackType);
        if (tracks.length > 0) {
          const minZIndex = Math.min(...tracks.map((t) => t.zIndex));
          targetTrack.zIndex = minZIndex - 1;
        }
        addTrackToDoc(targetTrack);
      }
    } else {
      // ========== Layers 버튼: 새 트랙 생성 후 startTime 0에 배치 ==========
      newStartTime = 0;

      console.log(
        '[useAsset] Layers button mode - Create new track at time 0:',
        {
          assetName: asset.name,
          startTime: 0,
          duration,
        }
      );

      targetTrack = Track.create(Track.AssetTypeToTrackType(asset.type));
      if (tracks.length > 0) {
        const minZIndex = Math.min(...tracks.map((t) => t.zIndex));
        targetTrack.zIndex = minZIndex - 1;
      }
      addTrackToDoc(targetTrack);
    }

    // 새로운 시작/종료 시간 설정
    clip.startTime = newStartTime;
    clip.endTime = newStartTime + duration;

    console.log('[useAsset] Final clip placement:', {
      trackId: targetTrack.id,
      clipTiming: { start: clip.startTime, end: clip.endTime, duration },
    });

    addClipToDoc(targetTrack.id, clip as any);
  };

  return { addClip, firstTrackId, status };
}
