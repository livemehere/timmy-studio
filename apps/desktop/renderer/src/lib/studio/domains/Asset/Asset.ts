import type { AssetStatus, IAsset } from './types';

export class Asset {
  /**
   * 미디어 파일 에셋인지 확인 (video, audio, image, animated-image)
   * Shape와 Text는 미디어 에셋이 아님
   */
  static isMediaAsset(
    asset: IAsset
  ): asset is Extract<
    IAsset,
    { type: 'video' | 'audio' | 'image' | 'animated-image' }
  > {
    return (
      asset.type === 'video' ||
      asset.type === 'audio' ||
      asset.type === 'image' ||
      asset.type === 'animated-image'
    );
  }

  /**
   * 가상 에셋인지 확인 (shape, text)
   * 미디어 파일이 없는 에셋
   */
  static isVirtualAsset(asset: IAsset): boolean {
    return asset.type === 'shape' || asset.type === 'text';
  }

  /**
   * metadata를 가진 에셋인지 확인
   */
  static hasMetadata(
    asset: IAsset
  ): asset is Extract<
    IAsset,
    { type: 'video' | 'audio' | 'image' | 'animated-image' }
  > {
    return this.isMediaAsset(asset);
  }

  static getStatus(asset: IAsset): AssetStatus {
    if (this.isVirtualAsset(asset)) {
      // Shape와 Text는 항상 ready 상태
      return {
        isReady: true,
        trackType: 'graphic',
        isError: false,
      };
    }

    // 이제 asset은 미디어 타입임이 보장됨
    if (!this.isMediaAsset(asset)) {
      throw new Error('Unreachable: asset should be media type');
    }

    const isError = Boolean(asset.isLoadError);

    switch (asset.type) {
      case 'video':
        return {
          isReady:
            !isError && Boolean(asset.isProxyReady && asset.thumbnailPath),
          trackType: 'graphic',
          isError,
        };
      case 'audio':
        return { isReady: !isError, trackType: 'audio', isError };
      case 'image':
        return { isReady: !isError, trackType: 'graphic', isError };
      case 'animated-image':
        return { isReady: !isError, trackType: 'graphic', isError };
    }
  }
}
