import { Sprite, Container } from 'pixi.js';
import type {
  ClipType,
  IGraphicClip,
  ITransform,
} from '../../domains/Clip/types';
import type { Renderer } from '../Renderer';
import type { TickContext } from '../types';

export abstract class ClipRenderer<T extends IGraphicClip> {
  abstract readonly type: ClipType;
  protected constructor(public readonly renderer: Renderer) {}

  abstract add(clip: T, trackContainer: Container): Promise<void>;
  abstract update(clip: T): void;
  abstract remove(clipId: string): void;
  abstract tick(ctx: TickContext): void;

  protected applyTransform(sprite: Sprite, transforms: ITransform): void {
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
