import type { IAsset } from '@renderer/lib/studio/types/asset';
import type { IClip, ITrack } from '@renderer/lib/studio/types/types';
import { useDocStore } from '@renderer/lib/studio/hooks/useStudioStores';
import {
  createEmptyAudioTrack,
  createEmptyVideoTrack,
} from '@renderer/lib/studio/utils/track';
import {
  createClip,
  type CreateAudioClipOptions,
  type CreateClipOptionsUnion,
  type CreateImageClipOptions,
  type CreateVideoClipOptions,
} from '@renderer/lib/studio/utils/clip';
import { NONE_VIDEO_CLIP_DEFAULT_DURATION_MS } from '../../constants/clip';

export interface UseCreateAssetToClipOptions {
  /** 특정 트랙에 추가 (기본값: 타입에 따른 첫 번째 트랙) */
  trackId?: string;

  /** 기본값: append(현재 트랙 마지막 클립 뒤) */
  insertMode?: 'append' | 'atStart';

  /** createClip 옵션을 직접 오버라이드 (startTime/endTime/transforms 등 포함) */
  clipOptions?: Partial<CreateClipOptionsUnion>;
}

export function useCreateAssetToClip(asset: IAsset) {
  const tracks = useDocStore((state) => state.tracks);
  const addTrack = useDocStore((state) => state.addTrack);
  const addClipToTrack = useDocStore((state) => state.addClipToTrack);

  const isDisabled = asset.type === 'video' && asset.isProxyReady === false;

  const addClip = async (options: UseCreateAssetToClipOptions = {}) => {
    if (asset.type === 'video' && asset.isProxyReady === false) {
      throw new Error(
        'Proxy가 준비되지 않은 비디오 에셋은 클립으로 추가할 수 없습니다.'
      );
    }

    const trackType: ITrack['type'] =
      asset.type === 'audio' ? 'audio' : 'video';

    let track: ITrack | undefined = options.trackId
      ? tracks.find((t) => t.id === options.trackId)
      : tracks.find((t) => t.type === trackType);

    if (!track) {
      const existingCount = tracks.filter((t) => t.type === trackType).length;
      track =
        trackType === 'video'
          ? createEmptyVideoTrack(`videoTrack-${existingCount}`, existingCount)
          : createEmptyAudioTrack(`audioTrack-${existingCount}`, existingCount);

      addTrack(track);
    }

    const durationMs =
      asset.metadata.durationMs ?? NONE_VIDEO_CLIP_DEFAULT_DURATION_MS;

    const appendStartTime =
      (track as any).clips?.length > 0
        ? Math.max(...(track as any).clips.map((c: IClip) => c.endTime))
        : 0;

    const startTime =
      options.clipOptions?.startTime ??
      (options.insertMode === 'atStart' ? 0 : appendStartTime);

    const endTime = options.clipOptions?.endTime ?? startTime + durationMs;

    const clipDurationMs = endTime - startTime;

    if (asset.type === 'video') {
      const base: CreateVideoClipOptions = {
        type: 'video',
        name: asset.name,
        assetId: asset.id,
        startTime,
        endTime,
        width: asset.metadata.width,
        height: asset.metadata.height,
        trimStart: 0,
        trimEnd: clipDurationMs,
      };
      const merged: CreateVideoClipOptions = {
        ...base,
        ...((options.clipOptions as Partial<CreateVideoClipOptions>) ?? {}),
      };

      const newClip = createClip(merged) as unknown as IClip;
      addClipToTrack(track.id, newClip);
      return newClip;
    } else if (asset.type === 'image') {
      const base: CreateImageClipOptions = {
        type: 'image',
        name: asset.name,
        assetId: asset.id,
        startTime,
        endTime,
        width: asset.metadata.width,
        height: asset.metadata.height,
      };
      const merged: CreateImageClipOptions = {
        ...base,
        ...((options.clipOptions as Partial<CreateImageClipOptions>) ?? {}),
      };

      const newClip = createClip(merged) as unknown as IClip;
      addClipToTrack(track.id, newClip);
      return newClip;
    } else {
      const base: CreateAudioClipOptions = {
        type: 'audio',
        name: asset.name,
        assetId: asset.id,
        startTime,
        endTime,
        trimStart: 0,
        trimEnd: clipDurationMs,
      };
      const merged: CreateAudioClipOptions = {
        ...base,
        ...((options.clipOptions as Partial<CreateAudioClipOptions>) ?? {}),
      };

      const newClip = createClip(merged) as unknown as IClip;
      addClipToTrack(track.id, newClip);
      return newClip;
    }
  };

  return { isDisabled, addClip };
}
