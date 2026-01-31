import { Container, Sprite, BlurFilter, Graphics } from 'pixi.js';
import { PixelateFilter } from 'pixi-filters/pixelate';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import { GraphicClip } from '../GraphicClip';
import type { IGraphicClip, ITransform } from '../../types';
import type { IEffectMask } from '@/lib/studio/types/effect';

export abstract class SpriteClip extends GraphicClip {
  // width,height 담당
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

  protected applyDataChange(): void {
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
    // this.debugCall('(Sprite) applyTransform');

    const root = this.container;

    // 1) base scale (size -> scale)
    const baseScale = this.baseScaleFor(transforms);
    const userScale = this.userScaleFor(transforms);
    this.setSpriteScale({
      x: baseScale.x * userScale.x,
      y: baseScale.y * userScale.y,
    });

    // 2) pivot (center)
    this.setPivotCenter();

    // 3) position (top-left -> center)
    this.setPositionTopLeft(transforms.position);

    // 4) zIndex
    if (this._data.zIndex !== undefined) {
      root.zIndex = this._data.zIndex;
    }

    // 5) rotation / alpha
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

  // 콘텐츠 원본 크기
  private get contentSize(): { width: number; height: number } {
    const texture = this.sprite.texture;
    const width = texture?.orig?.width || texture?.width || 0;
    const height = texture?.orig?.height || texture?.height || 0;
    return { width, height };
  }

  // 사용자는 width,height 로 크기를 지정하지만 내부적으로는 scale로 처리
  private baseScaleFor(transforms: ITransform): { x: number; y: number } {
    const { width, height } = this.contentSize;
    if (transforms.size) {
      return {
        x: transforms.size.width / width,
        y: transforms.size.height / height,
      };
    }
    return { x: 1, y: 1 };
  }

  // 사용자 지정 scale(width,height 외의 scale)
  private userScaleFor(transforms: ITransform): { x: number; y: number } {
    return {
      x: transforms.scaleX ?? 1,
      y: transforms.scaleY ?? 1,
    };
  }

  private setSpriteScale(scale: { x: number; y: number }): void {
    this.sprite.scale.set(scale.x, scale.y);
  }

  // container의 pivot를 콘텐츠 크기 기준으로 중앙에 맞춤
  private setPivotCenter(): void {
    const root = this.container;
    const { width, height } = this.contentSize;
    const scale = this.sprite.scale;
    root.pivot.set((width * scale.x) / 2, (height * scale.y) / 2);
  }

  private setPositionTopLeft(
    position: ITransform['position'] | undefined
  ): void {
    if (!position) return;
    const root = this.container;
    const { width, height } = this.contentSize;
    const scale = this.sprite.scale;
    root.x = position.x + (width * scale.x) / 2;
    root.y = position.y + (height * scale.y) / 2;
  }
}
