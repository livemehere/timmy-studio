import { Container, Sprite, BlurFilter, Graphics } from 'pixi.js';
import { PixelateFilter } from 'pixi-filters/pixelate';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import { GraphicClip } from './GraphicClip';
import type { IGraphicClip, ITransform } from './types';
import type { IEffectMask } from '@/lib/studio/types/effect';

export abstract class SpriteClip extends GraphicClip {
  public sprite: Sprite;

  // For masked effects
  private effectContainers: Map<string, Container> = new Map();
  private maskGraphics: Map<string, Graphics> = new Map();

  protected constructor(renderer: GraphicRenderer, data: IGraphicClip) {
    super(renderer, data);
    this.sprite = new Sprite();
    this.sprite.label = `Clip-${this.id}`;
    this.container.addChild(this.sprite);
  }

  protected applyEffects(): void {
    this.cleanupEffectContainers();
    this.debugCall('(Sprite) applyEffects');
    const effects = this._data.effects || [];

    // Clean up old effect containers and masks

    // Separate effects into full and masked
    const fullEffects = effects.filter((e) => e.enabled && !e.mask?.enabled);
    const maskedEffects = effects.filter((e) => e.enabled && e.mask?.enabled);

    // Apply full-screen effects to container
    const fullFilters: any[] = [];
    fullEffects.forEach((effect) => {
      const filter = this.createFilter(effect);
      if (filter) fullFilters.push(filter);
    });
    this.container.filters = fullFilters.length > 0 ? fullFilters : null;

    // Apply masked effects
    maskedEffects.forEach((effect) => {
      if (effect.mask) {
        this.applyMaskedEffect(effect, effect.mask);
      }
    });
  }

  protected applyTransform(transforms: ITransform): void {
    this.debugCall('(Sprite) applyTransform');

    const root = this.container;
    const sprite = this.sprite;
    const texture = sprite.texture;
    const contentWidth = texture?.orig?.width || texture?.width || 0;
    const contentHeight = texture?.orig?.height || texture?.height || 0;
    const hasSize = contentWidth > 0 && contentHeight > 0;

    // 1) base scale (size -> scale)
    let baseScaleX = 1;
    let baseScaleY = 1;
    if (transforms.size && hasSize) {
      baseScaleX = transforms.size.width / contentWidth;
      baseScaleY = transforms.size.height / contentHeight;
    }

    // 2) user scale
    const userScaleX = transforms.scaleX ?? 1;
    const userScaleY = transforms.scaleY ?? 1;
    const scaleX = baseScaleX * userScaleX;
    const scaleY = baseScaleY * userScaleY;

    sprite.scale.set(scaleX, scaleY);

    // 3) pivot (center)
    if (hasSize) {
      root.pivot.set((contentWidth * scaleX) / 2, (contentHeight * scaleY) / 2);
    } else {
      root.pivot.set(0, 0);
    }

    // 4) position (top-left -> center)
    if (transforms.position) {
      if (hasSize) {
        root.x = transforms.position.x + (contentWidth * scaleX) / 2;
        root.y = transforms.position.y + (contentHeight * scaleY) / 2;
      } else {
        root.x = transforms.position.x;
        root.y = transforms.position.y;
      }
    }

    // 5) zIndex
    if (this._data.zIndex !== undefined) {
      root.zIndex = this._data.zIndex;
    }

    // 6) rotation / alpha
    if (transforms.rotation !== undefined) {
      root.rotation = transforms.rotation;
    }
    if (transforms.opacity !== undefined) {
      root.alpha = transforms.opacity;
    }
  }

  private createFilter(effect: any): any {
    this.debugCall('(Sprite) createFilter');
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

  private applyMaskedEffect(effect: any, mask: IEffectMask): void {
    this.debugCall('(Sprite) applyMaskedEffect');
    // Create container for this masked effect
    const container = new Container();
    container.label = `MaskedEffect-${effect.id}`;

    // Get texture dimensions (before scaling)
    const texture = this.sprite.texture;
    const texWidth = texture?.orig?.width || texture?.width || 0;
    const texHeight = texture?.orig?.height || texture?.height || 0;

    // Calculate actual sprite dimensions (after scaling)
    const spriteWidth = texWidth * this.sprite.scale.x;
    const spriteHeight = texHeight * this.sprite.scale.y;

    // Convert normalized coordinates to actual pixel coordinates
    const x = mask.x * spriteWidth;
    const y = mask.y * spriteHeight;
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
    maskedSprite.scale.copyFrom(this.sprite.scale);
    maskedSprite.alpha = this.sprite.alpha;

    // Apply filter to masked sprite
    const filter = this.createFilter(effect);
    if (filter) {
      maskedSprite.filters = [filter];
    }

    // Set mask
    container.addChild(maskGraphics);
    container.addChild(maskedSprite);
    maskedSprite.mask = maskGraphics;

    // Add to clip root container
    this.container.addChild(container);

    // Store for cleanup
    this.effectContainers.set(effect.id, container);
    this.maskGraphics.set(effect.id, maskGraphics);
  }

  private cleanupEffectContainers(): void {
    this.debugCall('(Sprite) cleanupEffectContainers');
    this.effectContainers.forEach((container) => {
      container.destroy({ children: true });
    });
    this.effectContainers.clear();
    this.maskGraphics.clear();
  }
}
