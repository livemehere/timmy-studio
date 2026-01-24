import type { StoreApi } from 'zustand/vanilla';
import type { DocStore } from './docStore';
import type { EngineStore } from './engineStore';
import isEqual from 'fast-deep-equal';
import { toast } from 'sonner';
import type {
  IAudioTrack,
  IGraphicTrack,
} from '@/lib/studio/domains/Track/types';

/**
 * docStore의 변경사항을 engineStore에 자동으로 반영하는 바인딩 로직
 */
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
      docStore,
      engine,
      doc.tracks.filter((track) => track.type === 'graphic')
    ),
    syncAudioTracks(
      docStore,
      engine,
      doc.tracks.filter((track) => track.type === 'audio')
    ),
  ]);
  console.log('[Binding] 초기 동기화 완료');

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
        docStore,
        engine,
        state.tracks.filter((track) => track.type === 'graphic')
      ).catch((e) => {
        console.error('[GraphicRenderer] 트랙 동기화 실패', e);
        toast.error('Graphic sync failed', {
          description: 'Renderer sync error occurred',
        });
      });
      syncAudioTracks(
        docStore,
        engine,
        state.tracks.filter((track) => track.type === 'audio')
      ).catch((e) => {
        console.error('[AudioRenderer] 트랙 동기화 실패', e);
        toast.error('Audio sync failed', {
          description: 'Audio renderer sync error occurred',
        });
      });
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
 * - sync 는 내부서서 에서 에러 처리를 track, clip 단위로 수행함, 따라서 여기서 에러 처리 불필요
 * - 단, sync 가 성공한 track, clip id 목록과 실패한 track, clip id 목록을 반환하기 때문에, 실패한  ids 는 docStore 에서 제거해 주는 작업이 필요함
 */

async function syncGraphicTracks(
  docStore: StoreApi<DocStore>,
  engine: EngineStore,
  tracks: IGraphicTrack[]
): Promise<void> {
  const { syncedTrackIds, syncedClipIds, failedTrackIds, failedClipIds } =
    await engine.renderer!.syncTracks(tracks);

  engine.applyRendererSyncResult({
    trackIds: syncedTrackIds,
    clipIds: syncedClipIds,
  });

  console.log(
    `[Renderer] 트랙 동기화 완료 - tracks: ${syncedTrackIds.length}개, clips: ${syncedClipIds.length}개`
  );

  if (failedTrackIds.length > 0) {
    docStore.getState().removeTrack(failedTrackIds);
  }
  if (failedClipIds.length > 0) {
    failedClipIds.forEach(({ trackId, clipId }) => {
      docStore.getState().removeClip(trackId, clipId);
    });
  }
}
async function syncAudioTracks(
  docStore: StoreApi<DocStore>,
  engine: EngineStore,
  tracks: IAudioTrack[]
): Promise<void> {
  const { syncedTrackIds, syncedClipIds, failedTrackIds, failedClipIds } =
    await engine.audioRenderer!.syncTracks(tracks);

  engine.applyAudioSyncResult({
    trackIds: syncedTrackIds,
    clipIds: syncedClipIds,
  });

  console.log(
    `[AudioRenderer] 트랙 동기화 완료 - tracks: ${syncedTrackIds.length}개, clips: ${syncedClipIds.length}개`
  );

  if (failedTrackIds.length > 0) {
    docStore.getState().removeTrack(failedTrackIds);
  }
  if (failedClipIds.length > 0) {
    failedClipIds.forEach(({ trackId, clipId }) => {
      docStore.getState().removeClip(trackId, clipId);
    });
  }
}
