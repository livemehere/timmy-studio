import { Container, Sprite, Texture } from 'pixi.js';
import type { IImageClip } from '../../domains/Clip/types';
import type { Renderer } from '../Renderer';
import type { TickContext, ClipState } from '../types';
import { toFilePath } from '../../utils/toFilePath';
import { ClipUtils } from '../../domains/Clip/utils';
import type { IImageAsset } from '../../domains/Asset/types';
import { ClipRenderer } from './ClipRenderer';

export class ImageClipRenderer extends ClipRenderer<IImageClip> {
  readonly type = 'image';

  constructor(renderer: Renderer) {
    super(renderer);
  }

  async add(clip: IImageClip, container: Container): Promise<void> {
    const asset = this.renderer
      .getDoc()
      .assets.find((a) => a.id === clip.assetId) as IImageAsset;
    if (!asset || asset.type !== 'image') return;

    try {
      const element = await this.createImageElement(asset);
      const texture = Texture.from(element);
      const sprite = new Sprite(texture);
      sprite.label = `Clip-${clip.id}`;

      this.applyTransform(sprite, clip.transforms);
      container.addChild(sprite);
      this.renderer.clipSprites.set(clip.id, sprite);

      const state: ClipState = {
        clip,
        trackId: container.label?.replace('Track-', '') || '',
        element,
        isUsingProxy: false,
        lastSeekTime: -1,
        lastSeekTarget: null,
        dirty: false,
        dirtySessionId: null,
        pendingProxySwap: false,
        pendingOriginSwap: false,
      };
      this.renderer.clipStates.set(clip.id, state);
      console.log(`[ImageClipRenderer] ImageClip(${clip.id}) added`);
    } catch (e) {
      console.error(e);
    }
  }

  update(clip: IImageClip): void {
    const state = this.renderer.clipStates.get(clip.id);
    const sprite = this.renderer.clipSprites.get(clip.id);
    if (!state || !sprite) return;

    state.clip = clip;
    const curTimeMs = this.renderer.timer.currentMs;
    const isVisible =
      clip.enabled && ClipUtils.isClipVisibleAtTime(clip, curTimeMs);
    sprite.visible = isVisible;
    if (isVisible) {
      this.applyTransform(sprite, clip.transforms);
    }
  }

  remove(clipId: string): void {
    const sprite = this.renderer.clipSprites.get(clipId);
    const state = this.renderer.clipStates.get(clipId);

    if (sprite) {
      sprite.parent?.removeChild(sprite);
      sprite.destroy(true);
      this.renderer.clipSprites.delete(clipId);
    }
    if (state) {
      const { element } = state;
      if (element instanceof HTMLImageElement) {
        this.cleanupImageElement(element);
      }
      this.renderer.clipStates.delete(clipId);
    }
    console.log(`[ImageClipRenderer] Clip(${clipId}) removed`);
  }

  tick(ctx: TickContext): void {
    for (const [clipId, state] of this.renderer.clipStates) {
      if (state.clip.type !== 'image') continue;
      const sprite = this.renderer.clipSprites.get(clipId);
      if (!sprite) continue;

      const { clip } = state;
      const { currentTime } = ctx;
      const isVisible =
        currentTime >= clip.startTime && currentTime < clip.endTime;
      sprite.visible = isVisible;

      if (isVisible) {
        this.applyTransform(sprite, clip.transforms);
      }
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
