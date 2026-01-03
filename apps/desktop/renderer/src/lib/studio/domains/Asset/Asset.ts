import type { AssetStatus, IAsset } from './types';

export class Asset {
  static getStatus(asset: IAsset): AssetStatus {
    const isError = Boolean(asset.isLoadError);

    switch (asset.type) {
      case 'video':
        return {
          isReady:
            isError || Boolean(asset.isProxyReady && asset.thumbnailPath),
          trackType: 'graphic',
          isError,
        };
      case 'audio':
        return { isReady: true, trackType: 'audio', isError };
      case 'image':
        return { isReady: true, trackType: 'graphic', isError };

      case 'animated-image':
        return { isReady: true, trackType: 'graphic', isError };
    }
  }
}
