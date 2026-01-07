import type { IAsset } from '@renderer/lib/studio/domains/Asset/types';
import {
  useDocStore,
  useStudioStores,
} from '@renderer/lib/studio/hooks/useStudioStores';
import { useMemo } from 'react';

import { Asset } from '@renderer/lib/studio/domains/Asset/Asset';
import { Clip } from '@renderer/lib/studio/domains/Clip/Clip';
import { GraphicClip } from '@renderer/lib/studio/domains/Clip/GraphicClip';
import { GraphicTrack } from '@renderer/lib/studio/domains/Track/GraphicTrack';
import type { ITrack } from '../../Track/types';
import { Track } from '@renderer/lib/studio/domains/Track/Track';

// 클립 배치 모드 설정
// - 'APPEND': 마지막 클립 끝에 붙이기 (기존 방식)
// - 'CURSOR': 현재 타이머 시간에 배치 (겹치면 새 트랙 생성)
const CLIP_PLACEMENT_MODE: 'APPEND' | 'CURSOR' = 'CURSOR';

export function useAsset(asset: IAsset) {
  const { docStore } = useStudioStores();
  const addTrackToDoc = useDocStore((state) => state.addTrack);
  const addClipToDoc = useDocStore((state) => state.addClip);
  const tracks = useDocStore((state) => state.tracks);
  const settings = useDocStore((state) => state.settings);

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
      // 있으면, 해당 트랙 마지막 클립 뒤, 없으면, 새로운 트랙 생성 후 추가
      trackId?: string;

      /** 비디오/이미지 에셋에 기본 placement preset 적용 */
      placementPresetKey?: keyof typeof GraphicClip.ASSET_PLACEMENT_PRESETS;
    } = {}
  ) => {
    if (!status.isReady) {
      throw new Error('에셋이 준비되지 않았습니다.');
    }

    let targetTrack: ITrack;
    if (options.trackId) {
      targetTrack = docStore.getState().getTrackById(options.trackId)!;
    } else {
      targetTrack = Track.create(Track.AssetTypeToTrackType(asset.type));
      // 가장 낮은 zIndex에서 -1한 값으로 설정 (아래에 추가)
      if (tracks.length > 0) {
        const minZIndex = Math.min(...tracks.map((t) => t.zIndex));
        targetTrack.zIndex = minZIndex - 1;
      }
      addTrackToDoc(targetTrack);
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

    // 시작 시간을 트랙의 마지막 클립 끝나는 시간으로 조정
    // NOTE: targetTrack을 다시 가져와서 최신 clips 상태를 반영
    const latestTargetTrack = docStore.getState().getTrackById(targetTrack.id)!;
    const newStartTime = GraphicTrack.getLastestClipEndTime(latestTargetTrack);

    // duration 계산 (startTime 변경 전에 계산해야 함)
    const duration = clip.endTime - clip.startTime;

    console.log('[useAsset] Adding clip to track:', {
      assetName: asset.name,
      trackId: targetTrack.id,
      originalTiming: { start: clip.startTime, end: clip.endTime, duration },
      newStartTime,
      finalTiming: {
        start: newStartTime,
        end: newStartTime + duration,
        duration,
      },
    });

    // 새로운 시작/종료 시간 설정
    clip.startTime = newStartTime;
    clip.endTime = newStartTime + duration;

    addClipToDoc(targetTrack.id, clip as any);
  };

  return { addClip, firstTrackId, status };
}
