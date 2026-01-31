import { Texture } from 'pixi.js';
import type { IImageClip } from '../../../types';
import { SpriteClip } from '../SpriteClip';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import { toFilePath } from '@/lib/studio/utils/toFilePath';
import type { IImageAsset } from '../../../../Asset/types';

export class ImageClip extends SpriteClip {
  readonly type = 'image';
  declare protected _data: IImageClip;

  private element: HTMLImageElement | null = null;

  constructor(renderer: GraphicRenderer, data: IImageClip) {
    super(renderer, data);
    this.debugCall('(Image) constructor');
  }

  async init(): Promise<void> {
    this.debugCall('(image) === init ===');
    const asset = this.renderer
      .getDoc()
      .assets.find((a: any) => a.id === this._data.assetId) as IImageAsset;
    if (!asset || asset.type !== 'image') {
      throw new Error(
        `[ImageClip] Asset not found or invalid: ${this._data.assetId}`
      );
    }

    this.element = await this.createImageElement(asset);
    this.sprite.texture = Texture.from(this.element);

    this.sync(this.data);
    this.debugCall('(image) === init-end ===');
  }

  destroy(): void {
    this.debugCall('(image) destroy called');
    if (this.element) {
      this.cleanupImageElement(this.element);
      this.element = null;
    }
    super.destroy();
  }

  private createImageElement(asset: IImageAsset): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error(`Failed to load image: ${asset.filePath}`));
      img.src = toFilePath(asset.filePath);
    });
  }

  private cleanupImageElement(img: HTMLImageElement): void {
    img.onload = null;
    img.onerror = null;
    img.removeAttribute('src');
    img.src = '';
  }
}
