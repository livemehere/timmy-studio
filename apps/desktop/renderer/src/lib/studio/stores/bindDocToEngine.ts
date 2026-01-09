import type { StoreApi } from 'zustand/vanilla';
import type { DocStore } from './docStore';
import type { EngineStore } from './engineStore';
import isEqual from 'fast-deep-equal';
import type {
  IAudioTrack,
  IGraphicTrack,
} from '@/lib/studio/domains/Track/types';

/**
 * docStore의 변경사항을 engineStore에 자동으로 반영하는 바인딩 로직
 */
export function bindDocToEngine(
  docStore: StoreApi<DocStore>,
  engineStore: StoreApi<EngineStore>
) {
  console.log('[Binding] Doc-Engine 을 바인딩 합니다');

  const engine = engineStore.getState();
  const doc = docStore.getState();

  syncGraphicTracks(
    engine,
    doc.tracks.filter((track) => track.type === 'graphic')
  );
  syncAudioTracks(
    engine,
    doc.tracks.filter((track) => track.type === 'audio')
  );

  const unsubscribe = docStore.subscribe((state, prevState) => {
    if (!isEqual(state.settings, prevState.settings)) {
      engine.renderer!.resize(state.settings.width, state.settings.height);
      engine.renderer!.background = state.settings.background;
      engine.renderer!.frameRate = state.settings.frameRate;
      engine.timer!.durationMs = state.settings.duration;
      engine.audioRenderer!.sampleRate = state.settings.sampleRate;
    }

    // 얕은 비교로 변경 감지
    if (state.tracks !== prevState.tracks) {
      console.log('[Binding] 트랙 변경이 감지되었습니다');

      syncGraphicTracks(
        engine,
        state.tracks.filter((track) => track.type === 'graphic')
      );
      syncAudioTracks(
        engine,
        state.tracks.filter((track) => track.type === 'audio')
      );
    }
  });

  // Cleanup function
  return () => {
    console.log('[Binding] Cleaning up doc-to-engine bindings');
    unsubscribe();
  };
}

/**
 * Video 트랙 동기화
 */
function syncGraphicTracks(engine: EngineStore, tracks: IGraphicTrack[]) {
  engine
    .renderer!.syncTracks(tracks)
    .then(({ syncedTrackIds, syncedClipIds }) => {
      engine.applyRendererSyncResult({
        trackIds: syncedTrackIds,
        clipIds: syncedClipIds,
      });
      console.log(
        `[Renderer] 트랙 동기화 완료 - tracks: ${syncedTrackIds.length}개, clips: ${syncedClipIds.length}개`
      );
    });
}

/**
 * Audio 트랙 동기화
 */
function syncAudioTracks(engine: EngineStore, tracks: IAudioTrack[]) {
  engine
    .audioRenderer!.syncTracks(tracks)
    .then(({ syncedTrackIds, syncedClipIds }) => {
      engine.applyAudioSyncResult({
        trackIds: syncedTrackIds,
        clipIds: syncedClipIds,
      });
      console.log(`[AudioRenderer] 트랙 동기화 완료`);
    });
}
