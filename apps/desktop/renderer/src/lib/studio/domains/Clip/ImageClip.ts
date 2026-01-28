import { Texture } from 'pixi.js';
import type { IImageClip } from './types';
import { SpriteClip } from './SpriteClip';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import type { TickContext } from '@/lib/studio/engine/types';
import { toFilePath } from '@/lib/studio/utils/toFilePath';
import type { IImageAsset } from '../Asset/types';

export class ImageClip extends SpriteClip {
  readonly type = 'image';
  public _data: IImageClip;

  // State
  private element: HTMLImageElement | null = null;

  constructor(renderer: GraphicRenderer, data: IImageClip) {
    super(renderer, data);
    this._data = data;
  }

  async init(): Promise<void> {
    this.debugCall('(image) init start');
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
    this.debugCall('(image) init complete');
  }

  destroy(): void {
    this.debugCall('(image) destroy called');
    if (this.element) {
      this.cleanupImageElement(this.element);
      this.element = null;
    }

    super.destroy();
  }

  override onTick(ctx: TickContext): void {
    super.onTick(ctx);
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
    img.src = '';
    img.removeAttribute('src');
  }
}
