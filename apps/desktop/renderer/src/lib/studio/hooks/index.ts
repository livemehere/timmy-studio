// Base hooks (store access)
export {
  StudioContext,
  useStudioStores,
  useDocStore,
  useEngineStore,
  type StudioStores,
} from './useStudioStores';

// Document hooks (DocStore)
export {
  useDocTracks,
  useDocTrack,
  useDocClip,
  useDocAssets,
  useDocAsset,
  useDocSettings,
  useDocMetadata,
  useDocName,
  useDocActions,
} from './useDoc';

// Engine hooks (EngineStore)
export {
  useEngineInitialized,
  useEngineTimer,
  useEngineRenderer,
  useEngineAudioManager,
  useEngineAssetManager,
  useEngineActions,
} from './useEngine';

// Pixi.js hooks (Renderer objects)
export {
  usePixiReady,
  usePixiSyncedTrackIds,
  usePixiSyncedClipIds,
  usePixiTrackContainer,
  usePixiClipSprite,
} from './usePixi';

// Audio hooks (AudioManager objects)
export {
  useAudioReady,
  useAudioSyncedTrackIds,
  useAudioSyncedClipIds,
  useAudioTrackNode,
  useAudioClipNode,
} from './useAudio';
