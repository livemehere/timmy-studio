import type { StoreApi } from 'zustand/vanilla';
import type { DocStore } from './docStore';
import type { EngineStore } from './engineStore';
import isEqual from 'fast-deep-equal';
import { deepDiffArrays } from '@renderer/lib/studio/utils/deepDiffArrays';

/**
 * docStore의 변경사항을 engineStore에 자동으로 반영하는 바인딩 로직
 */
export function bindDocToEngine(
  docStore: StoreApi<DocStore>,
  engineStore: StoreApi<EngineStore>
) {
  console.debug('[Binding] Setting up doc-to-engine bindings');

  const unsubscribe = docStore.subscribe((state, prevState) => {
    const engine = engineStore.getState();

    if (!engine.isInitialized) {
      throw new Error('[bindDocToEngine] Engine is not initialized yet.');
    }

    // 공통: videoTracks 추출 및 syncedIds 업데이트 헬퍼
    const getVideoTracks = () =>
      state.tracks.filter((track) => track.type === 'video');

    const getAudioTracks = () =>
      state.tracks.filter((track) => track.type === 'audio');

    const updateSyncedIds = () => {
      const videoTracks = getVideoTracks();
      const trackIds = videoTracks.map((t) => t.id);
      const clipIds = videoTracks.flatMap((t) => t.clips.map((c) => c.id));

      engineStore.getState().setSyncedTrackIds(trackIds);
      engineStore.getState().setSyncedClipIds(clipIds);

      console.debug(
        `[bindDocToEngine] Synced IDs updated - tracks: ${trackIds.length}, clips: ${clipIds.length}`
      );
    };

    // TODO: AudioManager 구현 완료 후 사용
    const updateSyncedAudioIds = () => {
      const audioTracks = getAudioTracks();
      const trackIds = audioTracks.map((t) => t.id);
      const clipIds = audioTracks.flatMap((t) => t.clips.map((c) => c.id));

      engineStore.getState().setSyncedAudioTrackIds(trackIds);
      engineStore.getState().setSyncedAudioClipIds(clipIds);

      console.debug(
        `[bindDocToEngine] Audio synced IDs updated - tracks: ${trackIds.length}, clips: ${clipIds.length}`
      );
    };

    const syncTracks = () => {
      if (!engine.renderer) return;
      const videoTracks = getVideoTracks();
      console.debug('[bindDocToEngine] Syncing tracks:', videoTracks.length);
      engine.renderer.syncTracks(videoTracks);

      // sync 후 IDs 업데이트
      updateSyncedIds();
    };

    // TODO: AudioManager 구현 완료 후 사용
    const syncAudioTracks = () => {
      if (!engine.audioManager) return;
      const audioTracks = getAudioTracks();
      console.debug('[bindDocToEngine] Syncing audio tracks:', audioTracks.length);
      engine.audioManager.syncTracks(audioTracks);

      // sync 후 IDs 업데이트
      updateSyncedAudioIds();
    };

    /** settings sync */
    if (!isEqual(state.settings, prevState.settings)) {
      if (!engine.renderer || !engine.timer || !engine.audioManager) {
        throw new Error(
          '[bindDocToEngine] Engine components are not initialized properly.'
        );
      }
      engine.renderer.resize(state.settings.width, state.settings.height);
      engine.renderer.background = state.settings.background;
      engine.renderer.frameRate = state.settings.frameRate;
      engine.timer.durationMs = state.settings.duration;
      engine.audioManager.sampleRate = state.settings.sampleRate;
    }

    /** assets sync */
    const assetsChanged = state.assets !== prevState.assets;
    if (assetsChanged) {
      if (!engine.assetManager) {
        throw new Error(
          '[bindDocToEngine] AssetManager is not initialized in engine.'
        );
      }

      const {
        added: addedAssets,
        removed: removedAssets,
        updated: updatedAssets,
      } = deepDiffArrays(prevState.assets, state.assets);

      const totalChanges =
        addedAssets.length + removedAssets.length + updatedAssets.length;
      if (totalChanges === 0) {
        console.debug('[bindDocToEngine] No actual asset changes detected.');
        return;
      }

      console.debug(
        '[bindDocToEngine] Assets changed. Added:',
        addedAssets.length,
        'Removed:',
        removedAssets.length,
        'Updated:',
        updatedAssets.length
      );

      engine.assetManager.beginToLoading(totalChanges, () => {
        syncTracks();
        syncAudioTracks(); // TODO: AudioManager 구현 완료 후 동작 확인
      });

      for (const asset of removedAssets) {
        console.debug(`[bindDocToEngine] Removing asset: ${asset.id}`);
        engine.assetManager.removeAssetById(asset.id);
      }
      for (const asset of updatedAssets) {
        console.debug(`[bindDocToEngine] Updating asset: ${asset.id}`);
        engine.assetManager.updateAsset(asset.id, asset);
      }
      for (const asset of addedAssets) {
        console.debug(`[bindDocToEngine] Adding asset: ${asset.id}`);
        engine.assetManager.addAsset(asset);
      }
    }

    // Tracks만 변경 시 renderer에 반영 (assets 변경과 동시에 일어나지 않은 경우)
    const tracksChanged = state.tracks !== prevState.tracks;
    if (tracksChanged && !assetsChanged) {
      if (!engine.assetManager!.isAllLoaded) {
        throw new Error('[bindDocToEngine] Assets are not fully loaded yet.');
      }
      syncTracks();
      syncAudioTracks(); // TODO: AudioManager 구현 완료 후 동작 확인
    }
  });

  // Cleanup function
  return () => {
    console.debug('[bindDocToEngine] Cleaning up doc-to-engine bindings');
    unsubscribe();
  };
}
