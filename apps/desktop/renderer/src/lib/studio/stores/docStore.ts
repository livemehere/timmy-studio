import { createStore } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import type { IProject, ITrack, IAsset } from '../types';
import isEqual from 'fast-deep-equal';

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
  loadProject: (project: IProject) => void;
  getProject: () => IProject; // 현재 상태를 IProject로 조합해서 반환
  updateSettings: (settings: Partial<IProject['settings']>) => void;
  updateMetadata: (metadata: Partial<IProject['metadata']>) => void;
  updateName: (name: string) => void;

  // Track actions
  addTrack: (track: ITrack) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<ITrack>) => void;

  // Asset actions
  addAsset: (asset: IAsset) => void;
  removeAsset: (assetId: string) => void;
  updateAsset: (assetId: string, updates: Partial<IAsset>) => void;

  // Reset
  reset: () => void;
}

export type DocStore = DocState & DocActions;

export const createDocStore = (initialProject?: IProject) => {
  const project = initialProject ?? DEFAULT_PROJECT;

  console.debug(`[DocStore] createStore ${project.id}`);
  return createStore<DocStore>()(
    devtools((set, get) => {
      // updatedAt 자동 갱신 헬퍼
      const setWithUpdatedAt = (partial: Partial<DocState>) => {
        const { metadata, ...rest } = partial;
        set({
          ...rest,
          metadata: {
            ...get().metadata,
            ...metadata,
            updatedAt: new Date().toISOString(),
          },
        });
      };

      return {
        // Initial state - 개별 필드로 펼침
        id: project.id,
        name: project.name,
        settings: project.settings,
        metadata: project.metadata,
        tracks: project.tracks,
        assets: project.assets,

        // Actions
        loadProject: (newProject) => {
          if (isEqual(get().getProject(), newProject)) {
            console.debug(
              `[DocStore] loadProject ${newProject.id} is already loaded. Skipping.`
            );
            return;
          }
          console.debug(`[DocStore] loadProject ${newProject.id} called`);
          set({
            id: newProject.id,
            name: newProject.name,
            settings: newProject.settings,
            metadata: newProject.metadata,
            tracks: newProject.tracks,
            assets: newProject.assets,
          });
        },

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
          setWithUpdatedAt({
            settings: { ...currentSettings, ...settingsUpdate },
          });
        },

        updateMetadata: (metadataUpdate) => {
          const currentMetadata = get().metadata;
          setWithUpdatedAt({
            metadata: {
              ...currentMetadata,
              ...metadataUpdate,
            },
          });
        },

        updateName: (name) => {
          setWithUpdatedAt({ name });
        },

        addTrack: (track) => {
          const currentTracks = get().tracks;
          setWithUpdatedAt({ tracks: [...currentTracks, track] });
        },

        removeTrack: (trackId) => {
          const currentTracks = get().tracks;
          setWithUpdatedAt({
            tracks: currentTracks.filter((t) => t.id !== trackId),
          });
        },

        updateTrack: (trackId, updates) => {
          const currentTracks = get().tracks;
          setWithUpdatedAt({
            tracks: currentTracks.map((track) =>
              track.id === trackId
                ? ({ ...track, ...updates } as ITrack)
                : track
            ),
          });
        },

        addAsset: (asset) => {
          const currentAssets = get().assets;
          setWithUpdatedAt({ assets: [...currentAssets, asset] });
        },

        removeAsset: (assetId) => {
          const currentAssets = get().assets;
          setWithUpdatedAt({
            assets: currentAssets.filter((a) => a.id !== assetId),
          });
        },

        updateAsset: (assetId, updates) => {
          const currentAssets = get().assets;
          setWithUpdatedAt({
            assets: currentAssets.map((asset) =>
              asset.id === assetId
                ? ({ ...asset, ...updates } as IAsset)
                : asset
            ),
          });
        },

        reset: () => {
          console.debug(`[DocStore] reset to default project`);
          set({
            id: DEFAULT_PROJECT.id,
            name: DEFAULT_PROJECT.name,
            settings: DEFAULT_PROJECT.settings,
            metadata: DEFAULT_PROJECT.metadata,
            tracks: DEFAULT_PROJECT.tracks,
            assets: DEFAULT_PROJECT.assets,
          });
        },
      };
    })
  );
};
