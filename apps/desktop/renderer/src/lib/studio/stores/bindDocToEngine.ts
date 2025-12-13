import type { StoreApi } from 'zustand/vanilla';
import type { DocStore } from './docStore';
import type { EngineStore } from './engineStore';
import isEqual from 'fast-deep-equal';

/**
 * docStore의 변경사항을 engineStore에 자동으로 반영하는 바인딩 로직
 */
export function bindDocToEngine(
  docStore: StoreApi<DocStore>,
  engineStore: StoreApi<EngineStore>
) {
  console.log('[Binding] Setting up doc-to-engine bindings');

  const unsubscribe = docStore.subscribe((state, prevState) => {
    const engine = engineStore.getState();

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

      console.log(
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

      console.log(
        `[bindDocToEngine] Audio synced IDs updated - tracks: ${trackIds.length}, clips: ${clipIds.length}`
      );
    };

    const syncTracks = () => {
      if (!engine.renderer) return;
      const videoTracks = getVideoTracks();
      console.log('[bindDocToEngine] Syncing tracks:', videoTracks.length);
      engine.renderer.syncTracks(videoTracks);

      // sync 후 IDs 업데이트
      updateSyncedIds();
    };

    // TODO: AudioManager 구현 완료 후 사용
    const syncAudioTracks = () => {
      if (!engine.audioManager) return;
      const audioTracks = getAudioTracks();
      console.log(
        '[bindDocToEngine] Syncing audio tracks:',
        audioTracks.length
      );
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

    /** tracks sync - clip-based instantiation */
    const tracksChanged = state.tracks !== prevState.tracks;
    if (tracksChanged) {
      console.log('[bindDocToEngine] Tracks changed - syncing to renderer');
      syncTracks();
      syncAudioTracks(); // TODO: AudioManager 구현 완료 후 동작 확인
    }
  });

  // Cleanup function
  return () => {
    console.log('[bindDocToEngine] Cleaning up doc-to-engine bindings');
    unsubscribe();
  };
}
