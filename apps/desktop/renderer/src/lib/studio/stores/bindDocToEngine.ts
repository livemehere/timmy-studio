import type { StoreApi } from 'zustand/vanilla';
import type { DocStore } from './docStore';
import type { EngineStore } from './engineStore';
import isEqual from 'fast-deep-equal';
import type {
  IAudioTrack,
  IVideoTrack,
} from '@renderer/lib/studio/types/types';

/**
 * Video 트랙 동기화
 */
function syncVideoTracks(engine: EngineStore, tracks: IVideoTrack[]) {
  engine
    .renderer!.syncTracks(tracks)
    .then(({ syncedTrackIds, syncedClipIds }) => {
      engine.setSyncedTrackIds(syncedTrackIds);
      engine.setSyncedClipIds(syncedClipIds);
      console.log(
        `[Binding] Renderer 트랙 동기화 완료 - tracks: ${syncedTrackIds.length}개, clips: ${syncedClipIds.length}개`
      );
    });
}

/**
 * Audio 트랙 동기화
 */
function syncAudioTracks(engine: EngineStore, tracks: IAudioTrack[]) {
  engine
    .audioManager!.syncTracks(tracks)
    .then(({ syncedTrackIds, syncedClipIds }) => {
      engine.setSyncedAudioTrackIds(syncedTrackIds);
      engine.setSyncedAudioClipIds(syncedClipIds);
      console.log(
        `[Binding] AudioManager 트랙 동기화 완료 - tracks: ${syncedTrackIds.length}개, clips: ${syncedClipIds.length}개`
      );
    });
}

/**
 * docStore의 변경사항을 engineStore에 자동으로 반영하는 바인딩 로직
 */
export function bindDocToEngine(
  docStore: StoreApi<DocStore>,
  engineStore: StoreApi<EngineStore>
) {
  console.group('[Binding] Doc-Engine 을 바인딩 합니다');

  const engine = engineStore.getState();
  const doc = docStore.getState();

  const videoTracks = doc.tracks.filter((track) => track.type === 'video');
  const audioTracks = doc.tracks.filter((track) => track.type === 'audio');

  syncVideoTracks(engine, videoTracks);
  syncAudioTracks(engine, audioTracks);

  const unsubscribe = docStore.subscribe((state, prevState) => {
    if (!isEqual(state.settings, prevState.settings)) {
      engine.renderer!.resize(state.settings.width, state.settings.height);
      engine.renderer!.background = state.settings.background;
      engine.renderer!.frameRate = state.settings.frameRate;
      engine.timer!.durationMs = state.settings.duration;
      engine.audioManager!.sampleRate = state.settings.sampleRate;
    }

    const videoTracks = state.tracks.filter((track) => track.type === 'video');
    const audioTracks = state.tracks.filter((track) => track.type === 'audio');

    const tracksChanged = state.tracks !== prevState.tracks;
    if (tracksChanged) {
      syncVideoTracks(engine, videoTracks);
      syncAudioTracks(engine, audioTracks);
    }
  });

  console.groupEnd();

  // Cleanup function
  return () => {
    console.log('[Binding] Cleaning up doc-to-engine bindings');
    unsubscribe();
  };
}
