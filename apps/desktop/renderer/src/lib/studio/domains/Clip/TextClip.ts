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
  private underline: Graphics | null = null; // 언더라인 표시용

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
    if (this.underline) {
      this.underline.destroy();
      this.underline = null;
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
    // Apply anchor to text for rotation to work correctly
    const anchorX = transforms.anchorX ?? 0;
    const anchorY = transforms.anchorY ?? 0;
    if (this.text) {
      this.text.anchor.set(anchorX, anchorY);
    }

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
    // Text size is determined by fontSize and wordWrapWidth.
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
    const fontSize = this.data.textData.fontSize;
    const style = new TextStyle({
      fontFamily: this.data.textData.fontFamily,
      fontSize: fontSize,
      fill: this.data.textData.color,
      align: this.data.textData.align ?? 'left',
      fontWeight: this.data.textData.bold ? 'bold' : 'normal',
      fontStyle: this.data.textData.italic ? 'italic' : 'normal',
      letterSpacing: this.data.textData.letterSpacing ?? 0,
      lineHeight: (this.data.textData.lineHeight ?? 1) * fontSize,
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
    });

    this.text = new Text(this.data.textData.content, style);
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

    // 5. Create Underline
    this.updateUnderline();
  }

  private updateContent(): void {
    if (!this.text) return;

    // Update Text Style
    const fontSize = this.data.textData.fontSize;
    this.text.text = this.data.textData.content;
    this.text.style.fontFamily = this.data.textData.fontFamily;
    this.text.style.fontSize = fontSize;
    this.text.style.fill = this.data.textData.color;
    this.text.style.align = this.data.textData.align ?? 'left';
    this.text.style.fontWeight = this.data.textData.bold ? 'bold' : 'normal';
    this.text.style.fontStyle = this.data.textData.italic ? 'italic' : 'normal';
    this.text.style.letterSpacing = this.data.textData.letterSpacing ?? 0;
    this.text.style.lineHeight =
      (this.data.textData.lineHeight ?? 1) * fontSize;

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

    // Update Background
    this.updateBackground();

    // Update Selection Bounds
    this.updateSelectionBounds();

    // Update Underline
    this.updateUnderline();
  }

  private updateBackground(): void {
    const bgData = this.data.textData.background;

    if (bgData && typeof bgData === 'object') {
      if (!this.background) {
        this.background = new Graphics();
        this.sprite.addChildAt(this.background, 0);
      }

      const paddingX = bgData.paddingX ?? 0;
      const paddingY = bgData.paddingY ?? 0;
      const radius = bgData.radius ?? 0;
      const alpha = bgData.alpha ?? 1;

      const textWidth = this.text?.width ?? 0;
      const textHeight = this.text?.height ?? 0;
      const anchorX = this.text?.anchor.x ?? 0;
      const anchorY = this.text?.anchor.y ?? 0;

      const bgWidth = textWidth + paddingX * 2;
      const bgHeight = textHeight + paddingY * 2;

      this.background.clear();

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

    const width = this.text?.width ?? 0;
    const height = this.text?.height ?? 0;
    const anchorX = this.text?.anchor.x ?? 0;
    const anchorY = this.text?.anchor.y ?? 0;

    const x = -(width * anchorX);
    const y = -(height * anchorY);

    if (width > 0 && height > 0) {
      this.selectionBounds.rect(x, y, width, height);
      this.selectionBounds.stroke({ width: 1, color: 0x00ffff, alpha: 0.5 });
    }
  }

  private updateUnderline(): void {
    const underlineEnabled = this.data.textData.underline ?? false;

    if (underlineEnabled) {
      if (!this.underline) {
        this.underline = new Graphics();
        this.sprite.addChild(this.underline);
      }

      this.underline.clear();

      if (!this.text) return;

      const textWidth = this.text.width;
      const textHeight = this.text.height;
      const fontSize = this.data.textData.fontSize;
      const anchorX = this.text.anchor.x;
      const anchorY = this.text.anchor.y;

      // Calculate underline position (2 pixels below baseline)
      const underlineY = fontSize * 0.15;
      const underlineHeight = fontSize * 0.05;

      this.underline.moveTo(
        -(textWidth * anchorX),
        underlineY - textHeight * anchorY
      );
      this.underline.lineTo(
        textWidth - textWidth * anchorX,
        underlineY - textHeight * anchorY
      );
      this.underline.stroke({
        width: underlineHeight,
        color: this.data.textData.color,
      });
    } else {
      if (this.underline) {
        this.underline.destroy();
        this.underline = null;
      }
    }
  }

  private shouldRecreateText(prev: ITextClip, next: ITextClip): boolean {
    // Optimization: Only recreate if necessary properties change.
    // For now, return false and rely on updateTextStyle which covers most cases.
    if (!prev || !next) return false;
    return false;
  }
}
