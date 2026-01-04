import { Texture } from 'pixi.js';
import type { IImageClip } from './types';
import { GraphicClip } from './GraphicClip';
import type { GraphicRenderer } from '@renderer/lib/studio/engine/GraphicRenderer';
import type { TickContext } from '@renderer/lib/studio/engine/types';
import { toFilePath } from '@renderer/lib/studio/utils/toFilePath';
import type { IImageAsset } from '../Asset/types';

export class ImageClip extends GraphicClip {
  readonly type = 'image';
  public data: IImageClip;

  // State
  private element: HTMLImageElement | null = null;

  constructor(renderer: GraphicRenderer, data: IImageClip) {
    super(renderer, data);
    this.data = data;
  }

  async init(): Promise<void> {
    const asset = this.renderer
      .getDoc()
      .assets.find((a: any) => a.id === this.data.assetId) as IImageAsset;
    if (!asset || asset.type !== 'image') return;

    try {
      this.element = await this.createImageElement(asset);
      this.sprite.texture = Texture.from(this.element);

      this.applyTransform(this.data.transforms);

      console.log(`[ImageClip] ImageClip(${this.id}) initialized`);
    } catch (e) {
      console.error(e);
    }
  }

  update(data: IImageClip): void {
    this.data = data;
    const curTimeMs = this.renderer.timer.currentMs;
    const isVisible = data.enabled && this.isVisibleAt(curTimeMs);
    this.sprite.visible = isVisible;
    if (isVisible) {
      this.applyTransform(data.transforms);
    }
  }

  destroy(): void {
    this.sprite.destroy(true);

    if (this.element) {
      this.cleanupImageElement(this.element);
    }

    console.log(`[ImageClip] Clip(${this.id}) destroyed`);
  }

  tick(ctx: TickContext): void {
    const { currentTime } = ctx;
    const isVisible = this.shouldRender(currentTime);
    this.sprite.visible = isVisible;

    if (isVisible) {
      this.applyTransform(this.data.transforms);
    }
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
