import type { AssetStatus, IAsset } from './types';

export class Asset {
  static getStatus(asset: IAsset): AssetStatus {
    const isError = asset.isLoadError;

    switch (asset.type) {
      case 'video':
        return {
          isReady:
            isError || Boolean(asset.isProxyReady && asset.thumbnailPath),
          trackType: 'video',
          isError,
        };
      case 'audio':
        return { isReady: true, trackType: 'audio', isError };
      case 'image':
        return { isReady: true, trackType: 'video', isError };

      case 'animated-image':
        return { isReady: true, trackType: 'video', isError };
    }
  }
}
