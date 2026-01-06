import { Container, Sprite, BlurFilter, Graphics } from 'pixi.js';
import { PixelateFilter } from 'pixi-filters/pixelate';
import type { GraphicRenderer } from '@renderer/lib/studio/engine/GraphicRenderer';
import { Clip } from './Clip';
import type {
  IClip,
  ITransform,
  PlacementPreset,
  PlacementResult,
  Size,
} from './types';
import type { IEffectMask } from '@renderer/lib/studio/types/effect';

export abstract class GraphicClip extends Clip {
  public sprite: Sprite;
  declare public data: IClip;

  // For masked effects
  private effectContainers: Map<string, Container> = new Map();
  private maskGraphics: Map<string, Graphics> = new Map();

  static readonly ASSET_PLACEMENT_PRESETS = {
    containCenter: { fit: 'contain', alignX: 'center', alignY: 'center' },

    // Vertical align (top/middle/bottom)
    containTop: { fit: 'contain', alignX: 'center', alignY: 'top' },
    containBottom: { fit: 'contain', alignX: 'center', alignY: 'bottom' },

    // Horizontal align (left/center/right)
    containLeft: { fit: 'contain', alignX: 'left', alignY: 'center' },
    containRight: { fit: 'contain', alignX: 'right', alignY: 'center' },

    // Fit by one axis (keep aspect)
    fitWidthCenter: { fit: 'fitWidth', alignX: 'center', alignY: 'center' },
    fitHeightCenter: { fit: 'fitHeight', alignX: 'center', alignY: 'center' },

    // Fill
    coverCenter: { fit: 'cover', alignX: 'center', alignY: 'center' },
    stretch: { fit: 'stretch', alignX: 'center', alignY: 'center' },
  } as const satisfies Record<string, PlacementPreset>;

  protected constructor(
    public readonly renderer: GraphicRenderer,
    data: IClip
  ) {
    super(renderer, data);
    this.sprite = new Sprite();
    this.sprite.label = `Clip-${this.id}`;
  }

  mount(container: Container) {
    container.addChild(this.sprite);
  }

  unmount() {
    this.sprite.parent?.removeChild(this.sprite);
  }

  /**
   * Effects 적용 (blur, pixelate 등)
   * mask가 있으면 특정 영역만 적용
   */
  protected applyEffects(): void {
    const effects = this.data.effects || [];

    // Clean up old effect containers and masks
    this.cleanupEffectContainers();

    // Separate effects into full and masked
    const fullEffects = effects.filter((e) => e.enabled && !e.mask?.enabled);
    const maskedEffects = effects.filter((e) => e.enabled && e.mask?.enabled);

    // Apply full-screen effects to sprite
    const fullFilters: any[] = [];
    fullEffects.forEach((effect) => {
      const filter = this.createFilter(effect);
      if (filter) fullFilters.push(filter);
    });
    this.sprite.filters = fullFilters.length > 0 ? fullFilters : null;

    // Apply masked effects
    maskedEffects.forEach((effect) => {
      if (effect.mask) {
        this.applyMaskedEffect(effect, effect.mask);
      }
    });
  }

  /**
   * Create filter from effect
   */
  private createFilter(effect: any): any {
    switch (effect.type) {
      case 'blur': {
        const strength = (effect.parameters.strength as number) ?? 8;
        const quality = (effect.parameters.quality as number) ?? 4;
        return new BlurFilter({ strength, quality });
      }
      case 'pixelate': {
        const size = (effect.parameters.size as number) ?? 10;
        return new PixelateFilter(size);
      }
      default:
        return null;
    }
  }

  /**
   * Apply effect to masked area only
   */
  private applyMaskedEffect(effect: any, mask: IEffectMask): void {
    // Create container for this masked effect
    const container = new Container();
    container.label = `MaskedEffect-${effect.id}`;

    // Container should be at the same position as sprite
    container.x = this.sprite.x;
    container.y = this.sprite.y;
    container.rotation = this.sprite.rotation;

    // Get texture dimensions (before scaling)
    const texture = this.sprite.texture;
    const texWidth = texture?.orig?.width || texture?.width || 0;
    const texHeight = texture?.orig?.height || texture?.height || 0;

    // Calculate actual sprite dimensions (after scaling)
    const spriteWidth = texWidth * this.sprite.scale.x;
    const spriteHeight = texHeight * this.sprite.scale.y;

    // Convert normalized coordinates to actual pixel coordinates
    // Account for anchor point
    const anchorOffsetX = -this.sprite.anchor.x * spriteWidth;
    const anchorOffsetY = -this.sprite.anchor.y * spriteHeight;

    const x = anchorOffsetX + mask.x * spriteWidth;
    const y = anchorOffsetY + mask.y * spriteHeight;
    const width = mask.width * spriteWidth;
    const height = mask.height * spriteHeight;

    // Create mask graphics
    const maskGraphics = new Graphics();

    // Draw mask shape
    if (mask.shape === 'rectangle') {
      maskGraphics.rect(x, y, width, height);
    } else if (mask.shape === 'ellipse') {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const radiusX = width / 2;
      const radiusY = height / 2;
      maskGraphics.ellipse(centerX, centerY, radiusX, radiusY);
    }
    maskGraphics.fill({ color: 0xffffff, alpha: 1 });

    // Create a sprite copy for the masked area
    const maskedSprite = new Sprite(this.sprite.texture);
    maskedSprite.anchor.copyFrom(this.sprite.anchor);
    maskedSprite.scale.copyFrom(this.sprite.scale);
    maskedSprite.alpha = this.sprite.alpha;
    // Don't copy position/rotation - it's handled by container

    // Apply filter to masked sprite
    const filter = this.createFilter(effect);
    if (filter) {
      maskedSprite.filters = [filter];
    }

    // Set mask
    container.addChild(maskGraphics);
    container.addChild(maskedSprite);
    maskedSprite.mask = maskGraphics;

    // Add to parent container (same as sprite)
    if (this.sprite.parent) {
      this.sprite.parent.addChild(container);
    }

    // Store for cleanup
    this.effectContainers.set(effect.id, container);
    this.maskGraphics.set(effect.id, maskGraphics);
  }

  /**
   * Clean up effect containers and masks
   */
  private cleanupEffectContainers(): void {
    this.effectContainers.forEach((container) => {
      container.destroy({ children: true });
    });
    this.effectContainers.clear();
    this.maskGraphics.clear();
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
  static computePlacement({
    total,
    target,
    preset,
  }: {
    total: Size;
    target: Size;
    preset: PlacementPreset;
  }): PlacementResult {
    const totalW = Number(total.width);
    const totalH = Number(total.height);
    const targetW = Number(target.width);
    const targetH = Number(target.height);

    if (
      !Number.isFinite(totalW) ||
      !Number.isFinite(totalH) ||
      !Number.isFinite(targetW) ||
      !Number.isFinite(targetH) ||
      totalW <= 0 ||
      totalH <= 0 ||
      targetW <= 0 ||
      targetH <= 0
    ) {
      return {
        position: { x: 0, y: 0 },
        size: {
          width: Math.max(0, totalW || 0),
          height: Math.max(0, totalH || 0),
        },
      };
    }

    let width = total.width;
    let height = total.height;

    switch (preset.fit) {
      case 'original': {
        width = targetW;
        height = targetH;
        break;
      }
      case 'stretch': {
        width = totalW;
        height = totalH;
        break;
      }
      case 'fitWidth': {
        width = totalW;
        height = (totalW * targetH) / targetW;
        break;
      }
      case 'fitHeight': {
        height = totalH;
        width = (totalH * targetW) / targetH;
        break;
      }
      case 'contain': {
        const scale = Math.min(totalW / targetW, totalH / targetH);
        width = targetW * scale;
        height = targetH * scale;
        break;
      }
      case 'cover': {
        const scale = Math.max(totalW / targetW, totalH / targetH);
        width = targetW * scale;
        height = targetH * scale;
        break;
      }
    }

    const x =
      preset.alignX === 'left'
        ? 0
        : preset.alignX === 'center'
          ? (totalW - width) / 2
          : totalW - width;

    const y =
      preset.alignY === 'top'
        ? 0
        : preset.alignY === 'center'
          ? (totalH - height) / 2
          : totalH - height;

    return {
      position: { x, y },
      size: { width, height },
    };
  }
}
