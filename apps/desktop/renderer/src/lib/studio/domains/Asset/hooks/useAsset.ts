import type { IAsset } from '@renderer/lib/studio/domains/Asset/types';
import type {
  IAudioTrack,
  ITrack,
  ITransform,
  IVideoTrack,
} from '@renderer/lib/studio/types/types';
import { useDocStore } from '@renderer/lib/studio/hooks/useStudioStores';
import {
  createEmptyAudioTrack,
  createEmptyVideoTrack,
  getLastestClipEndTime,
} from '@renderer/lib/studio/utils/track';
import {
  createClip,
  type CreateAudioClipOptions,
  type CreateClipOptionsUnion,
  type CreateImageClipOptions,
  type CreateVideoClipOptions,
} from '@renderer/lib/studio/utils/clip';
import { NONE_VIDEO_CLIP_DEFAULT_DURATION_MS } from '../../../constants/clip';
import { useMemo } from 'react';
import {
  ASSET_PLACEMENT_PRESETS,
  computePlacement,
} from '@renderer/lib/studio/utils/transformPresets';

interface AssetStatus {
  isReady: boolean;
  trackType: 'video' | 'audio';
}

interface Options {
  /** 특정 트랙에 추가 (기본값: 타입에 따른 첫 번째 트랙) */
  trackId?: string;

  /** 기본값: append(현재 트랙 마지막 클립 뒤) */
  insertMode?: 'append' | 'atStart';

  /** createClip 옵션을 직접 오버라이드 (startTime/endTime/transforms 등 포함) */
  clipOptions?: Partial<CreateClipOptionsUnion>;

  /** 비디오/이미지 에셋에 기본 placement preset 적용 */
  placementPresetKey?: keyof typeof ASSET_PLACEMENT_PRESETS;
}

export function useAsset(asset: IAsset) {
  const getTrackById = useDocStore((state) => state.getTrackById);
  const addTrackToDoc = useDocStore((state) => state.addTrack);
  const addClipToDoc = useDocStore((state) => state.addClip);
  const tracks = useDocStore((state) => state.tracks);
  const settings = useDocStore((state) => state.settings);

  const _resolveTrack = (type: 'video' | 'audio', trackId?: string) => {
    if (trackId) {
      const existing = getTrackById(trackId);
      if (existing && existing.type === type) return existing;
    }

    const newTrack =
      type === 'video'
        ? createEmptyVideoTrack('newTrack', tracks.length)
        : createEmptyAudioTrack('newTrack', tracks.length);
    addTrackToDoc(newTrack);
    return newTrack;
  };

  const _computeStartEnd = (args: {
    track: ITrack;
    insertMode?: Options['insertMode'];
    clipOptions?: Options['clipOptions'];
  }): { startTime: number; endTime: number; durationMs: number } => {
    const durationMs =
      asset.metadata.durationMs ?? NONE_VIDEO_CLIP_DEFAULT_DURATION_MS;

    const appendStartTime = getLastestClipEndTime(args.track);
    const startTime =
      args.clipOptions?.startTime ??
      (args.insertMode === 'atStart' ? 0 : appendStartTime);
    const endTime = args.clipOptions?.endTime ?? startTime + durationMs;

    return { startTime, endTime, durationMs: endTime - startTime };
  };

  function _computePresetTransforms(
    placementPresetKey?: Options['placementPresetKey']
  ): Pick<ITransform, 'position' | 'size'> | undefined {
    if (!placementPresetKey) return undefined;

    const assetWidth = asset.metadata.width;
    const assetHeight = asset.metadata.height;
    if (assetWidth == null || assetHeight == null) return undefined;

    return computePlacement({
      total: { width: settings.width, height: settings.height },
      target: { width: assetWidth, height: assetHeight },
      preset: ASSET_PLACEMENT_PRESETS[placementPresetKey],
    });
  }

  function _pickVideoClipOverrides(
    clipOptions?: Options['clipOptions']
  ): Partial<CreateVideoClipOptions> | undefined {
    if (!clipOptions) return undefined;

    const picked: Partial<CreateVideoClipOptions> = {};
    if (clipOptions.name != null) picked.name = clipOptions.name;
    if (clipOptions.startTime != null) picked.startTime = clipOptions.startTime;
    if (clipOptions.endTime != null) picked.endTime = clipOptions.endTime;

    if ('width' in clipOptions && clipOptions.width != null) {
      picked.width = clipOptions.width;
    }
    if ('height' in clipOptions && clipOptions.height != null) {
      picked.height = clipOptions.height;
    }
    if ('trimStart' in clipOptions && clipOptions.trimStart != null) {
      picked.trimStart = clipOptions.trimStart;
    }
    if ('trimEnd' in clipOptions && clipOptions.trimEnd != null) {
      picked.trimEnd = clipOptions.trimEnd;
    }
    if ('transforms' in clipOptions && clipOptions.transforms != null) {
      picked.transforms = clipOptions.transforms;
    }

    return picked;
  }

  function _pickImageClipOverrides(
    clipOptions?: Options['clipOptions']
  ): Partial<CreateImageClipOptions> | undefined {
    if (!clipOptions) return undefined;

    const picked: Partial<CreateImageClipOptions> = {};
    if (clipOptions.name != null) picked.name = clipOptions.name;
    if (clipOptions.startTime != null) picked.startTime = clipOptions.startTime;
    if (clipOptions.endTime != null) picked.endTime = clipOptions.endTime;

    if ('width' in clipOptions && clipOptions.width != null) {
      picked.width = clipOptions.width;
    }
    if ('height' in clipOptions && clipOptions.height != null) {
      picked.height = clipOptions.height;
    }
    if ('transforms' in clipOptions && clipOptions.transforms != null) {
      picked.transforms = clipOptions.transforms;
    }

    return picked;
  }

  function _pickAudioClipOverrides(
    clipOptions?: Options['clipOptions']
  ): Partial<CreateAudioClipOptions> | undefined {
    if (!clipOptions) return undefined;

    const picked: Partial<CreateAudioClipOptions> = {};
    if (clipOptions.name != null) picked.name = clipOptions.name;
    if (clipOptions.startTime != null) picked.startTime = clipOptions.startTime;
    if (clipOptions.endTime != null) picked.endTime = clipOptions.endTime;

    if ('trimStart' in clipOptions && clipOptions.trimStart != null) {
      picked.trimStart = clipOptions.trimStart;
    }
    if ('trimEnd' in clipOptions && clipOptions.trimEnd != null) {
      picked.trimEnd = clipOptions.trimEnd;
    }
    if ('volume' in clipOptions && clipOptions.volume != null) {
      picked.volume = clipOptions.volume;
    }

    return picked;
  }

  function _createVideoClip(args: {
    track: IVideoTrack;
    startTime: number;
    endTime: number;
    clipDurationMs: number;
    clipOptions?: Partial<CreateVideoClipOptions>;
    presetTransforms?: Pick<ITransform, 'position' | 'size'>;
  }) {
    const base: CreateVideoClipOptions = {
      type: 'video',
      name: asset.name,
      assetId: asset.id,
      startTime: args.startTime,
      endTime: args.endTime,
      width: asset.metadata.width,
      height: asset.metadata.height,
      trimStart: 0,
      trimEnd: args.clipDurationMs,
      transforms: args.presetTransforms,
    };

    const override = args.clipOptions ?? {};

    const transforms =
      args.presetTransforms || override.transforms
        ? {
            ...(args.presetTransforms ?? {}),
            ...(override.transforms ?? {}),
          }
        : undefined;

    const merged: CreateVideoClipOptions = {
      ...base,
      ...override,
      transforms,
    };

    const newClip = createClip(merged);
    addClipToDoc(args.track.id, newClip);
    return newClip;
  }

  function _createImageClip(args: {
    track: IVideoTrack;
    startTime: number;
    endTime: number;
    clipOptions?: Partial<CreateImageClipOptions>;
    presetTransforms?: Pick<ITransform, 'position' | 'size'>;
  }) {
    const base: CreateImageClipOptions = {
      type: 'image',
      name: asset.name,
      assetId: asset.id,
      startTime: args.startTime,
      endTime: args.endTime,
      width: asset.metadata.width,
      height: asset.metadata.height,
      transforms: args.presetTransforms,
    };

    const override = args.clipOptions ?? {};

    const transforms =
      args.presetTransforms || override.transforms
        ? {
            ...(args.presetTransforms ?? {}),
            ...(override.transforms ?? {}),
          }
        : undefined;

    const merged: CreateImageClipOptions = {
      ...base,
      ...override,
      transforms,
    };

    const newClip = createClip(merged);
    addClipToDoc(args.track.id, newClip);
    return newClip;
  }

  function _createAudioClip(args: {
    track: IAudioTrack;
    startTime: number;
    endTime: number;
    clipDurationMs: number;
    clipOptions?: Partial<CreateAudioClipOptions>;
  }) {
    const base: CreateAudioClipOptions = {
      type: 'audio',
      name: asset.name,
      assetId: asset.id,
      startTime: args.startTime,
      endTime: args.endTime,
      trimStart: 0,
      trimEnd: args.clipDurationMs,
    };

    const merged: CreateAudioClipOptions = {
      ...base,
      ...(args.clipOptions ?? {}),
    };

    const newClip = createClip(merged);
    addClipToDoc(args.track.id, newClip);
    return newClip;
  }

  const status = useMemo<AssetStatus>(() => {
    switch (asset.type) {
      case 'video':
        return {
          isReady: Boolean(asset.isProxyReady && asset.thumbnailPath),
          trackType: 'video',
        };
      case 'audio':
        return { isReady: false, trackType: 'audio' };
      case 'image':
        return { isReady: false, trackType: 'video' };
      default:
        throw new Error(`지원하지 않는 에셋 타입입니다`);
    }
  }, [asset]);

  const createToClip = async (options: Options = {}) => {
    if (!status.isReady) {
      throw new Error('에셋이 준비되지 않았습니다.');
    }

    switch (asset.type) {
      case 'video': {
        const track = _resolveTrack('video', options.trackId) as IVideoTrack;
        const {
          startTime,
          endTime,
          durationMs: clipDurationMs,
        } = _computeStartEnd({
          track,
          insertMode: options.insertMode,
          clipOptions: options.clipOptions,
        });

        return _createVideoClip({
          track,
          startTime,
          endTime,
          clipDurationMs,
          clipOptions: _pickVideoClipOverrides(options.clipOptions),
          presetTransforms: _computePresetTransforms(
            options.placementPresetKey
          ),
        });
      }
      case 'image': {
        const track = _resolveTrack('video', options.trackId) as IVideoTrack;
        const { startTime, endTime } = _computeStartEnd({
          track,
          insertMode: options.insertMode,
          clipOptions: options.clipOptions,
        });

        return _createImageClip({
          track,
          startTime,
          endTime,
          clipOptions: _pickImageClipOverrides(options.clipOptions),
          presetTransforms: _computePresetTransforms(
            options.placementPresetKey
          ),
        });
      }
      case 'audio': {
        const track = _resolveTrack('audio', options.trackId) as IAudioTrack;
        const {
          startTime,
          endTime,
          durationMs: clipDurationMs,
        } = _computeStartEnd({
          track,
          insertMode: options.insertMode,
          clipOptions: options.clipOptions,
        });

        return _createAudioClip({
          track,
          startTime,
          endTime,
          clipDurationMs,
          clipOptions: _pickAudioClipOverrides(options.clipOptions),
        });
      }
    }
  };

  return { createToClip, status };
}
