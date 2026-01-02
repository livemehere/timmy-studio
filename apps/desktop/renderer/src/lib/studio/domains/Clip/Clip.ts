import { Container, Sprite } from 'pixi.js';
import type { Renderer } from '@renderer/lib/studio/core/Renderer';
import type { TickContext } from '@renderer/lib/studio/core/types';
import type { IGraphicClip, ClipType, ITransform } from './types';

export abstract class Clip {
  abstract readonly type: ClipType;
  public sprite: Sprite;
  public id: string;

  // State for SeekSynchronizer
  public dirty: boolean = false;
  public dirtySessionId: number | null = null;

  protected constructor(
    public readonly renderer: Renderer,
    public data: IGraphicClip
  ) {
    this.id = data.id;
    this.sprite = new Sprite();
    this.sprite.label = `Clip-${this.id}`;
  }

  abstract init(): Promise<void>;
  abstract update(data: IGraphicClip): void;
  abstract destroy(): void;
  abstract tick(ctx: TickContext): void;

  mount(container: Container) {
    container.addChild(this.sprite);
  }

  unmount() {
    this.sprite.parent?.removeChild(this.sprite);
  }

  protected applyTransform(transforms: ITransform): void {
    const sprite = this.sprite;

    // 1) anchor
    if (transforms.anchorX !== undefined || transforms.anchorY !== undefined) {
      sprite.anchor.set(
        transforms.anchorX ?? sprite.anchor.x,
        transforms.anchorY ?? sprite.anchor.y
      );
    }

    // 2) position
    if (transforms.position) {
      sprite.x = transforms.position.x;
      sprite.y = transforms.position.y;
    }

    // 3) base scale (size -> scale)
    let baseScaleX = 1;
    let baseScaleY = 1;

    if (transforms.size) {
      const tex = sprite.texture;
      const srcW = tex?.orig?.width || tex?.width || 0;
      const srcH = tex?.orig?.height || tex?.height || 0;

      if (srcW > 0 && srcH > 0) {
        baseScaleX = transforms.size.width / srcW;
        baseScaleY = transforms.size.height / srcH;
      }
    }

    // 4) user scale
    const userScaleX = transforms.scaleX ?? 1;
    const userScaleY = transforms.scaleY ?? 1;

    sprite.scale.set(baseScaleX * userScaleX, baseScaleY * userScaleY);

    // 5) rotation / alpha
    if (transforms.rotation !== undefined) {
      sprite.rotation = transforms.rotation;
    }
    if (transforms.opacity !== undefined) {
      sprite.alpha = transforms.opacity;
    }
  }
}
