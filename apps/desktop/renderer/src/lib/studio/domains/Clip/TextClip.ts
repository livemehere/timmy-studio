import { Text, TextStyle, Graphics } from 'pixi.js';
import type { ITextClip, ITransform } from './types';
import { GraphicClip } from './GraphicClip';
import type { GraphicRenderer } from '@renderer/lib/studio/engine/GraphicRenderer';
import type { TickContext } from '@renderer/lib/studio/engine/types';

export class TextClip extends GraphicClip {
  readonly type = 'text';
  public data: ITextClip;
  private text: Text | null = null;
  private background: Graphics | null = null;
  private selectionBounds: Graphics | null = null; // 선택 영역 표시용

  constructor(renderer: GraphicRenderer, data: ITextClip) {
    super(renderer, data);
    this.data = data;
  }

  async init(): Promise<void> {
    this.createContent();
    this.applyTransform(this.data.transforms);
  }

  update(data: ITextClip): void {
    const prevData = this.data;
    this.data = data;

    // 데이터가 변경되었으므로 텍스트 업데이트
    if (this.shouldRecreateText(prevData, data)) {
      this.createContent();
    } else {
      this.updateContent();
    }

    // Bounds (Selection) update
    this.updateSelectionBounds();

    const curTimeMs = this.renderer.timer.currentMs;
    const isVisible = data.enabled && this.isVisibleAt(curTimeMs);
    this.sprite.visible = isVisible;
    if (isVisible) {
      this.applyTransform(data.transforms);
    }
  }

  destroy(): void {
    if (this.text) {
      this.text.destroy();
      this.text = null;
    }
    if (this.background) {
      this.background.destroy();
      this.background = null;
    }
    if (this.selectionBounds) {
      this.selectionBounds.destroy();
      this.selectionBounds = null;
    }
    this.sprite.destroy(true);
  }

  tick(ctx: TickContext): void {
    const { currentTime } = ctx;
    const isVisible = this.shouldRender(currentTime);
    this.sprite.visible = isVisible;

    if (isVisible) {
      this.applyTransform(this.data.transforms);
    }
  }

  /**
   * Overrides GraphicClip.applyTransform to handle Text specific scaling.
   * Unlike images/videos, Text should not be forced to fit a specific width/height ratio.
   * It should render at its natural size (based on font) and only be scaled by explicit scaleX/Y.
   */
  protected applyTransform(transforms: ITransform): void {
    const sprite = this.sprite;

    // 1) anchor
    // For TextClip, we apply anchor to the text child.
    // However, removing default anchor (0.5) as requested to fix background alignment issues.
    // If transforms has explicit anchor, use it, otherwise default to 0 (top-left).
    if (this.text) {
      this.text.anchor.set(transforms.anchorX ?? 0, transforms.anchorY ?? 0);
    }

    // Background and selection bounds also need to be centered if we use center anchor for text
    // The previous implementation of background used negative half width/height which assumes center anchor
    // Let's ensure background and selection bounds follow the anchor logic if possible,
    // OR we just assume they are drawn relative to the sprite center which is consistent with the text anchor

    // 2) position
    if (transforms.position) {
      sprite.x = transforms.position.x;
      sprite.y = transforms.position.y;
    }

    // Update zIndex for sorting in container
    if (this.data.zIndex !== undefined) {
      sprite.zIndex = this.data.zIndex;
    }

    // 3) Scale
    // We intentionally IGNORE transforms.size for scaling purposes.
    // Text size is determined by fontSize and wordWrapWidth (handled in updateTextStyle).
    // We only apply the explicit scale transform.
    const userScaleX = transforms.scaleX ?? 1;
    const userScaleY = transforms.scaleY ?? 1;

    sprite.scale.set(userScaleX, userScaleY);

    // 4) rotation / alpha
    if (transforms.rotation !== undefined) {
      sprite.rotation = transforms.rotation;
    }
    if (transforms.opacity !== undefined) {
      sprite.alpha = transforms.opacity;
    }
  }

  private createContent(): void {
    if (this.text) {
      this.text.destroy();
    }
    if (this.background) {
      this.background.destroy();
      this.background = null;
    }

    // 1. Create Text
    const shadow = this.data.textData.shadow;
    const style = new TextStyle({
      fontFamily: this.data.textData.fontFamily,
      fontSize: this.data.textData.fontSize,
      fill: this.data.textData.color,
      align: this.data.textData.align,
      fontWeight: this.data.textData.bold ? 'bold' : 'normal',
      fontStyle: this.data.textData.italic ? 'italic' : 'normal',
      stroke: this.data.textData.border?.color
        ? {
            color: this.data.textData.border.color,
            width: this.data.textData.border.width,
          }
        : undefined,
      dropShadow: shadow
        ? {
            color: shadow.color,
            blur: shadow.blur,
            angle: Math.atan2(shadow.offsetY, shadow.offsetX),
            distance: Math.sqrt(
              shadow.offsetX * shadow.offsetX + shadow.offsetY * shadow.offsetY
            ),
            alpha: shadow.alpha ?? 1,
          }
        : undefined,
      wordWrap: true,
      wordWrapWidth: this.data.transforms?.size?.width ?? 150, // 텍스트 래핑 너비 안전 처리
    });

    this.text = new Text({
      text: this.data.textData.content,
      style,
    });
    // Anchor defaults to 0 (top-left) now as requested
    this.text.anchor.set(0);

    // 2. Create Background (if needed)

    this.updateBackground();

    // 3. Add to Sprite (Order matters: Background -> Text)
    if (this.background) {
      this.sprite.addChild(this.background);
    }
    this.sprite.addChild(this.text);

    // 4. Create Selection Bounds
    this.updateSelectionBounds();
  }

  private updateContent(): void {
    if (!this.text) return;

    // Update Text Style
    this.text.text = this.data.textData.content;
    this.text.style.fontFamily = this.data.textData.fontFamily;
    this.text.style.fontSize = this.data.textData.fontSize;
    this.text.style.fill = this.data.textData.color;
    this.text.style.align = this.data.textData.align;
    this.text.style.fontWeight = this.data.textData.bold ? 'bold' : 'normal';
    this.text.style.fontStyle = this.data.textData.italic ? 'italic' : 'normal';

    if (this.data.textData.border) {
      this.text.style.stroke = {
        color: this.data.textData.border.color,
        width: this.data.textData.border.width,
      };
    } else {
      // @ts-ignore - stroke type issue workaround
      this.text.style.stroke = undefined;
    }

    if (this.data.textData.shadow) {
      const shadow = this.data.textData.shadow;
      this.text.style.dropShadow = {
        color: shadow.color,
        blur: shadow.blur,
        angle: Math.atan2(shadow.offsetY, shadow.offsetX),
        distance: Math.sqrt(
          shadow.offsetX * shadow.offsetX + shadow.offsetY * shadow.offsetY
        ),
        alpha: shadow.alpha ?? 1,
      };
    } else {
      this.text.style.dropShadow = false;
    }

    // Update Word Wrap
    this.text.style.wordWrap = true;
    this.text.style.wordWrapWidth = this.data.transforms?.size?.width ?? 150;

    // Update Background
    this.updateBackground();

    // Update Selection Bounds
    this.updateSelectionBounds();
  }

  private updateBackground(): void {
    const bgData = this.data.textData.background;

    if (bgData && typeof bgData === 'object') {
      if (!this.background) {
        this.background = new Graphics();
        this.sprite.addChildAt(this.background, 0); // Ensure background is behind text
      }

      const paddingX = bgData.paddingX ?? 0;
      const paddingY = bgData.paddingY ?? 0;
      const radius = bgData.radius ?? 0;
      const alpha = bgData.alpha ?? 1;

      // Calculate background dimensions based on text metrics + padding
      const textWidth = this.text?.width ?? 0;
      const textHeight = this.text?.height ?? 0;

      const bgWidth = textWidth + paddingX * 2;
      const bgHeight = textHeight + paddingY * 2;

      this.background.clear();

      const anchorX = this.text?.anchor.x ?? 0;
      const anchorY = this.text?.anchor.y ?? 0;

      const x = -(textWidth * anchorX) - paddingX;
      const y = -(textHeight * anchorY) - paddingY;

      this.background.roundRect(x, y, bgWidth, bgHeight, radius);
      this.background.fill({ color: bgData.color, alpha: alpha });
    } else {
      if (this.background) {
        this.background.destroy();
        this.background = null;
      }
    }
  }

  private updateSelectionBounds(): void {
    if (this.selectionBounds) {
      this.selectionBounds.clear();
    } else {
      this.selectionBounds = new Graphics();
      this.sprite.addChild(this.selectionBounds);
    }

    const width = this.data.transforms?.size?.width ?? this.text?.width ?? 0;
    const height = this.data.transforms?.size?.height ?? this.text?.height ?? 0;

    const anchorX = this.text?.anchor.x ?? 0;
    const anchorY = this.text?.anchor.y ?? 0;

    const x = -(width * anchorX);
    const y = -(height * anchorY);

    if (width > 0 && height > 0) {
      this.selectionBounds.rect(x, y, width, height);
      this.selectionBounds.stroke({ width: 1, color: 0x00ffff, alpha: 0.5 });
    }

    if (this.data.transforms?.size?.height) {
      const maxHeight = this.data.transforms.size.height;

      if (this.text && this.text.height > maxHeight) {
        const mask = new Graphics();
        mask.rect(x, y, width, maxHeight);
        mask.fill(0xffffff);

        this.sprite.addChild(mask);
        mask.renderable = false;
        this.sprite.mask = mask;
      } else {
        this.sprite.mask = null;
      }
    } else {
      this.sprite.mask = null;
    }
  }

  private shouldRecreateText(prev: ITextClip, next: ITextClip): boolean {
    // Optimization: Only recreate if necessary properties change.
    // For now, return false and rely on updateTextStyle which covers most cases.
    if (!prev || !next) return false;
    return false;
  }
}
