import type {
  AssetStatus,
  IAsset,
} from '@renderer/lib/studio/domains/Asset/types';

export class AssetUtils {
  static getAssetStatus(asset: IAsset): AssetStatus {
    switch (asset.type) {
      case 'video':
        return {
          isReady: Boolean(asset.isProxyReady && asset.thumbnailPath),
          trackType: 'video',
        };
      // TODO: 아래 케이스는 나중에 구현 필요 (지금은 무조건 미지원)
      case 'audio':
        return { isReady: false, trackType: 'audio' };
      case 'image':
        return { isReady: false, trackType: 'video' };

      case 'animated-image':
        return { isReady: false, trackType: 'video' };
    }
  }
}
