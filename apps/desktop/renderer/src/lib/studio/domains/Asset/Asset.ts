import type { AssetStatus, IAsset } from './types';

export class Asset {
  static getStatus(asset: IAsset): AssetStatus {
    switch (asset.type) {
      case 'video':
        return {
          isReady: true, // Boolean(asset.isProxyReady && asset.thumbnailPath),
          trackType: 'video',
        };
      // TODO: 아래 케이스는 나중에 구현 필요 (지금은 무조건 미지원)
      case 'audio':
        return { isReady: true, trackType: 'audio' };
      case 'image':
        return { isReady: true, trackType: 'video' };

      case 'animated-image':
        return { isReady: true, trackType: 'video' };
    }
  }
}
