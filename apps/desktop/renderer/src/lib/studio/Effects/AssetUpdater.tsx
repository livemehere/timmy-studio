import { useEffect } from 'react';
import { useDocStore, useEngineStore } from '../hooks/useStudioStores';
import type { IAsset } from '../domains/Asset/types';
import type { VideoClip } from '../domains/Clip/GraphicClips/SpriteClips/Sprites/VideoClip';

export function AssetUpdater() {
  const updateAsset = useDocStore((state) => state.updateAsset);
  const renderer = useEngineStore((state) => state.renderer);

  useEffect(() => {
    return window.app.on('asset:update', (asset: IAsset) => {
      updateAsset(asset.id, asset);
      console.log('Asset updated from main process:', asset);

      // Notify existing VideoClips that their asset changed (proxy may be ready)
      if (asset.type === 'video' && renderer) {
        for (const track of renderer.tracks.values()) {
          for (const clip of track.clips.values()) {
            if (
              clip.type === 'video' &&
              (clip as any)._data?.assetId === asset.id
            ) {
              (clip as unknown as VideoClip).notifyAssetUpdated();
            }
          }
        }
      }
    });
  }, [updateAsset, renderer]);
  return null;
}
