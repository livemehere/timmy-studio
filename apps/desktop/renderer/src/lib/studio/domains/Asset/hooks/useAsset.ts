import type { IAsset } from '@renderer/lib/studio/domains/Asset/types';
import { useDocStore } from '@renderer/lib/studio/hooks/useStudioStores';
import { useMemo } from 'react';

import { Asset } from '@renderer/lib/studio/domains/Asset/Asset';
import { Clip } from '@renderer/lib/studio/domains/Clip/Clip';
import { Track } from '@renderer/lib/studio/domains/Track/Track';
import type { ITrack } from '../../Track/types';

export function useAsset(asset: IAsset) {
  const getTrackById = useDocStore((state) => state.getTrackById);
  const addTrackToDoc = useDocStore((state) => state.addTrack);
  const addClipToDoc = useDocStore((state) => state.addClip);
  const tracks = useDocStore((state) => state.tracks);
  const settings = useDocStore((state) => state.settings);

  const status = useMemo(() => {
    return Asset.getStatus(asset);
  }, [asset]);

  const firstTrackId = useMemo(() => {
    const trackType = Track.AssetTypeToTrackType(asset.type);
    const existTrack = Track.findFirstTrack(tracks, trackType);
    return existTrack?.id;
  }, [asset.type, tracks]);

  const addClip = async (
    options: {
      // 있으면, 해당 트랙 마지막 클립 뒤, 없으면, 새로운 트랙 생성 후 추가
      trackId?: string;

      /** 비디오/이미지 에셋에 기본 placement preset 적용 */
      placementPresetKey?: keyof typeof Clip.ASSET_PLACEMENT_PRESETS;
    } = {}
  ) => {
    if (!status.isReady) {
      throw new Error('에셋이 준비되지 않았습니다.');
    }

    let targetTrack: ITrack;
    if (options.trackId) {
      targetTrack = getTrackById(options.trackId)!;
    } else {
      targetTrack = Track.createTrackData(
        Track.AssetTypeToTrackType(asset.type)
      );
      addTrackToDoc(targetTrack);
    }

    const clip = Clip.createFromAsset(asset);

    // renderer 에 들어가는 clip 은 transform 정렬을 처리함.
    if (clip.type !== 'audio' && options.placementPresetKey) {
      const preset = Clip.ASSET_PLACEMENT_PRESETS[options.placementPresetKey];
      const computed = Clip.computePlacement({
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
    const startTime = Track.getLastestClipEndTime(targetTrack);
    clip.startTime = startTime;
    clip.endTime = startTime + (clip.endTime - clip.startTime);

    addClipToDoc(targetTrack.id, clip);
  };

  return { addClip, firstTrackId, status };
}
