import { createStore } from 'zustand/vanilla';
import type { IAsset } from '@renderer/lib/studio/domains/Asset/types';
import { produce } from 'immer';
import { computeNextProjectDurationMs } from '@renderer/lib/studio/utils/projectDuration';
import type { IProject } from '../types/project';
import type { ITrack } from '../domains/Track/types';
import type { IClip } from '../domains/Clip/types';

type AssetGetter = <T extends IAsset = IAsset>(
  assetId: string
) => T | undefined;

const DEFAULT_PROJECT: IProject = {
  id: 'default-project',
  name: 'New Project',
  settings: {
    width: 1280,
    height: 720,
    frameRate: 30,
    sampleRate: 44100,
    duration: 60000,
    background: '#000000',
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: 'unknown',
    description: '',
  },
  tracks: [],
  assets: [],
};

export interface DocState {
  // Document state (저주파, 저장되는 정답 상태)
  id: string;
  name: string;
  settings: IProject['settings'];
  metadata: IProject['metadata'];
  tracks: ITrack[];
  assets: IAsset[];
}

export interface DocActions {
  // Project actions
  getProject: () => IProject; // 현재 상태를 IProject로 조합해서 반환
  updateSettings: (settings: Partial<IProject['settings']>) => void;
  updateMetadata: (metadata: Partial<IProject['metadata']>) => void;
  updateName: (name: string) => void;

  // Track actions
  addTrack: (track: ITrack | ITrack[]) => void;
  removeTrack: (trackId: string | string[]) => void;
  updateTrack: (trackId: string, updates: Partial<ITrack>) => void;
  getTrackById: (trackId: string) => ITrack | undefined;

  // Clip actions
  addClip: (trackId: string, clip: IClip) => void;
  removeClip: (trackId: string, clipId: string) => void;
  updateClip: (
    trackId: string,
    clipId: string,
    updates: Partial<IClip>
  ) => void;
  moveClipToTrack: (
    sourceTrackId: string,
    targetTrackId: string,
    clipId: string
  ) => void;
  getClipById: <T extends IClip = IClip>(
    trackId: string,
    clipId: string
  ) => T | undefined;

  // Asset actions
  addAsset: (asset: IAsset | IAsset[]) => void;
  removeAsset: (assetId: string | string[]) => void;
  updateAsset: (assetId: string, updates: Partial<IAsset>) => void;
  getAssetById: AssetGetter;

  // Reset
  reset: () => void;
}

export type DocStore = DocState & DocActions;

export const createDocStore = (initialProject?: IProject) => {
  const project = initialProject ?? DEFAULT_PROJECT;

  console.log(`[DocStore] Doc 스토어 생성됨`);

  // Helper function to sort tracks by zIndex (descending)
  const sortTracksByZIndex = (tracks: ITrack[]): ITrack[] => {
    return [...tracks].sort((a, b) => b.zIndex - a.zIndex);
  };

  return createStore<DocStore>()((set, get) => {
    return {
      id: project.id,
      name: project.name,
      settings: project.settings,
      metadata: project.metadata,
      tracks: project.tracks,
      assets: project.assets,

      getProject: () => {
        const state = get();
        const project: IProject = {
          id: state.id,
          name: state.name,
          settings: state.settings,
          metadata: state.metadata,
          tracks: state.tracks,
          assets: state.assets,
        };
        return project;
      },

      updateSettings: (settingsUpdate) => {
        const currentSettings = get().settings;
        set({
          settings: { ...currentSettings, ...settingsUpdate },
        });
      },

      updateMetadata: (metadataUpdate) => {
        const currentMetadata = get().metadata;
        set({
          metadata: {
            ...currentMetadata,
            ...metadataUpdate,
          },
        });
      },

      updateName: (name) => {
        set({ name });
      },

      addTrack: (track) => {
        const trackArr = Array.isArray(track) ? track : [track];
        const currentTracks = get().tracks;
        const newTracks = sortTracksByZIndex([...currentTracks, ...trackArr]);
        set({ tracks: newTracks });
      },

      removeTrack: (trackId) => {
        const trackIdArr = Array.isArray(trackId) ? trackId : [trackId];
        const currentTracks = get().tracks;
        const newTracks = sortTracksByZIndex(
          currentTracks.filter((t) => !trackIdArr.includes(t.id))
        );
        set({ tracks: newTracks });
      },

      updateTrack: (trackId, updates) => {
        const currentTracks = get().tracks;
        const newTracks = sortTracksByZIndex(
          currentTracks.map((track) =>
            track.id === trackId ? ({ ...track, ...updates } as ITrack) : track
          )
        );
        set({ tracks: newTracks });
      },

      getTrackById: (trackId) => {
        const currentTracks = get().tracks;
        return currentTracks.find((t) => t.id === trackId);
      },

      addClip: (trackId: string, clip: IClip) => {
        const state = get();
        const newTracks = produce(state.tracks, (draft) => {
          const track = draft.find((t) => t.id === trackId);
          if (track) {
            (track.clips as IClip[]).push(clip);
          }
        });

        // NOTE: 나중에 사용자 설정/실험 플래그로 뺄 수 있도록 boolean으로 토글 가능하게 유지
        const enableAutoExtendDuration = true;
        const nextDuration = computeNextProjectDurationMs({
          enabled: enableAutoExtendDuration,
          currentDurationMs: state.settings.duration,
          tracks: newTracks,
        });

        if (nextDuration !== state.settings.duration) {
          set({
            tracks: newTracks,
            settings: { ...state.settings, duration: nextDuration },
          });
          return;
        }

        set({ tracks: newTracks });
      },

      removeClip: (trackId: string, clipId: string) => {
        const currentTracks = get().tracks;
        const newTracks = produce(currentTracks, (draft) => {
          const track = draft.find((t) => t.id === trackId);
          if (track) {
            const trackWithClips = track as any;
            trackWithClips.clips = trackWithClips.clips.filter(
              (clip: IClip) => clip.id !== clipId
            );
          }
        });
        set({ tracks: newTracks });
      },

      updateClip: (
        trackId: string,
        clipId: string,
        updates: Partial<IClip>
      ) => {
        const currentTracks = get().tracks;
        const newTracks = produce(currentTracks, (draft) => {
          const track = draft.find((t) => t.id === trackId);
          if (track) {
            const trackWithClips = track as any;
            const clip = trackWithClips.clips.find(
              (c: IClip) => c.id === clipId
            );
            if (clip) {
              Object.assign(clip, updates);
            }
          }
        });
        set({ tracks: newTracks });
      },

      moveClipToTrack: (
        sourceTrackId: string,
        targetTrackId: string,
        clipId: string
      ) => {
        if (sourceTrackId === targetTrackId) return;

        const currentTracks = get().tracks;
        const newTracks = produce(currentTracks, (draft) => {
          const sourceTrack = draft.find((t) => t.id === sourceTrackId);
          const targetTrack = draft.find((t) => t.id === targetTrackId);

          if (sourceTrack && targetTrack) {
            const sourceTrackWithClips = sourceTrack as any;
            const targetTrackWithClips = targetTrack as any;
            const clipIndex = sourceTrackWithClips.clips.findIndex(
              (c: IClip) => c.id === clipId
            );

            if (clipIndex !== -1) {
              const [clip] = sourceTrackWithClips.clips.splice(clipIndex, 1);
              targetTrackWithClips.clips.push(clip);
            }
          }
        });
        set({ tracks: newTracks });
      },

      addAsset: (asset) => {
        const assetArr = Array.isArray(asset) ? asset : [asset];
        const currentAssets = get().assets;
        set({ assets: [...currentAssets, ...assetArr] });
      },

      removeAsset: (assetId) => {
        const assetIdArr = Array.isArray(assetId) ? assetId : [assetId];
        const currentAssets = get().assets;
        set({
          assets: currentAssets.filter((a) => !assetIdArr.includes(a.id)),
        });
      },

      updateAsset: (assetId, updates) => {
        const currentAssets = get().assets;
        set({
          assets: currentAssets.map((asset) =>
            asset.id === assetId ? ({ ...asset, ...updates } as IAsset) : asset
          ),
        });
      },

      getAssetById: <T extends IAsset = IAsset>(assetId: string) => {
        const currentAssets = get().assets;
        return currentAssets.find((a) => a.id === assetId) as T | undefined;
      },

      getClipById: <T extends IClip = IClip>(
        trackId: string,
        clipId: string
      ): T | undefined => {
        const currentTracks = get().tracks;
        const track = currentTracks.find((t) => t.id === trackId);
        if (!track) return undefined;
        const clip = (track.clips as IClip[]).find((c) => c.id === clipId);
        return clip as T | undefined;
      },

      reset: () => {
        console.log(`[DocStore] 초기값으로 리셋`);
        set({
          id: project.id,
          name: project.name,
          settings: project.settings,
          metadata: project.metadata,
          tracks: project.tracks,
          assets: project.assets,
        });
      },
    };
  });
};
