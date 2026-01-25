import type { StoreApi } from 'zustand/vanilla';
import type { DocStore } from './docStore';
import type { EngineStore } from './engineStore';
import isEqual from 'fast-deep-equal';
import type {
  IAudioTrack,
  IGraphicTrack,
} from '@/lib/studio/domains/Track/types';

export async function bindDocToEngine(
  docStore: StoreApi<DocStore>,
  engineStore: StoreApi<EngineStore>
) {
  const engine = engineStore.getState();
  const doc = docStore.getState();

  await engine.renderer!.init();
  engineStore.getState().setRendererReady(true);

  await engine.audioRenderer!.init();
  engineStore.getState().setAudioReady(true);

  /** initial sync */
  await Promise.all([
    syncGraphicTracks(
      engine,
      doc.tracks.filter((track) => track.type === 'graphic')
    ),
    syncAudioTracks(
      engine,
      doc.tracks.filter((track) => track.type === 'audio')
    ),
  ]);
  console.log('[Binding] 초기 동기화 완료');

  const unsubscribe = docStore.subscribe((state, prevState) => {
    if (!isEqual(state.settings, prevState.settings)) {
      engine.renderer!.syncSettings({
        width: state.settings.width,
        height: state.settings.height,
        background: state.settings.background,
        frameRate: state.settings.frameRate,
      });
      engine.timer!.syncSettings({
        durationMs: state.settings.duration,
      });
      engine.audioRenderer!.syncSettings({
        sampleRate: state.settings.sampleRate,
      });
    }

    /** 얕은 비교로 변경 감지
     * enable to shallow compare, because graphicRenderer sync method handle, move, update, add internally not replace all.
     */
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

  console.log('[Binding] Doc-Engine 구독 시작됨');

  // Cleanup function
  return () => {
    console.log('[Binding] Doc-Engine 구독 해제됨');
    unsubscribe();
  };
}

/**
 * - 의도적으로 기다리지 않음
 * - sync 는 내부에서 track/clip 단위로 처리하고 결과(added/updated/removed/failed)를 반환
 * - 실패 처리 정책은 외부에서 결정 (재시도/유지/제거 등)
 * - ⚠️ 아래는 코드는 실패하지 않습니다. (never throw error)
 */

async function syncGraphicTracks(
  engine: EngineStore,
  tracks: IGraphicTrack[]
): Promise<void> {
  const result = await engine.renderer!.syncTracks(tracks);

  const syncedTrackIds = [...result.addedTrackIds, ...result.updatedTrackIds];

  const syncedClipIds = result.clipResults.flatMap((clipResult) => [
    ...clipResult.addedClipIds,
    ...clipResult.updatedClipIds,
  ]);

  const failedClipIds = result.clipResults.flatMap((clipResult) =>
    clipResult.failedClipIds.map((clipId) => ({
      trackId: clipResult.trackId,
      clipId,
    }))
  );

  engine.applyRendererSyncResult({
    trackIds: syncedTrackIds,
    clipIds: syncedClipIds,
    failedTrackIds: result.failedTrackIds,
    failedClipIds: failedClipIds.map((item) => item.clipId),
  });

  console.log(
    `[Renderer] 트랙 동기화 완료 - tracks: ${syncedTrackIds.length}개, clips: ${syncedClipIds.length}개`
  );

  if (result.failedTrackIds.length > 0) {
    console.warn('[Renderer] 동기화 실패 트랙:', result.failedTrackIds);
  }
  if (failedClipIds.length > 0) {
    console.warn('[Renderer] 동기화 실패 클립:', failedClipIds);
  }
}
async function syncAudioTracks(
  engine: EngineStore,
  tracks: IAudioTrack[]
): Promise<void> {
  const result = await engine.audioRenderer!.syncTracks(tracks);

  const syncedTrackIds = [...result.addedTrackIds, ...result.updatedTrackIds];

  const syncedClipIds = result.clipResults.flatMap((clipResult) => [
    ...clipResult.addedClipIds,
    ...clipResult.updatedClipIds,
  ]);

  const failedClipIds = result.clipResults.flatMap((clipResult) =>
    clipResult.failedClipIds.map((clipId) => ({
      trackId: clipResult.trackId,
      clipId,
    }))
  );

  engine.applyAudioSyncResult({
    trackIds: syncedTrackIds,
    clipIds: syncedClipIds,
    failedTrackIds: result.failedTrackIds,
    failedClipIds: failedClipIds.map((item) => item.clipId),
  });

  console.log(
    `[AudioRenderer] 트랙 동기화 완료 - tracks: ${syncedTrackIds.length}개, clips: ${syncedClipIds.length}개`
  );

  if (result.failedTrackIds.length > 0) {
    console.warn('[AudioRenderer] 동기화 실패 트랙:', result.failedTrackIds);
  }
  if (failedClipIds.length > 0) {
    console.warn('[AudioRenderer] 동기화 실패 클립:', failedClipIds);
  }
}
