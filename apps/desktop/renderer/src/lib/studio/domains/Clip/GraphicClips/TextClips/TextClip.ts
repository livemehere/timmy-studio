import { Text, TextStyle, Graphics } from 'pixi.js';
import type { ITextClip, ITransform } from '../../types';
import { GraphicClip } from '../GraphicClip';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import type { TickContext } from '@/lib/studio/engine/types';

export class TextClip extends GraphicClip {
  readonly type = 'text';
  public _data: ITextClip;
  private text: Text | null = null;
  private background: Graphics | null = null;
  private selectionBounds: Graphics | null = null; // 선택 영역 표시용
  private underline: Graphics | null = null; // 언더라인 표시용

  constructor(renderer: GraphicRenderer, data: ITextClip) {
    super(renderer, data);
    this._data = data;
  }

  async init(): Promise<void> {
    this.applyDataChange();
    this.applyTransform(this._data.transforms);
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
    this.container.destroy({ children: true });
  }

  override onTick(ctx: TickContext): void {
    super.onTick(ctx);
  }

  protected onUpdateVisible(_currentTime: number): void {
    this.applyTransform(this._data.transforms);
  }

  protected applyDataChange(): void {
    this.debugCall('applyEffects');

    // 텍스트 객체가 없으면 생성, 있으면 업데이트
    if (!this.text) {
      this.createTextContent();
    } else {
      this.updateContent();
    }

    this.updateSelectionBounds();
  }

  /**
   * Overrides GraphicClip.applyTransform to handle Text specific scaling.
   * Unlike images/videos, Text should not be forced to fit a specific width/height ratio.
   * It should render at its natural size (based on font) and only be scaled by explicit scaleX/Y.
   */
  protected applyTransform(transforms: ITransform): void {
    const root = this.container;
    const text = this.text;
    if (!text) return;

    const contentWidth = text.width;
    const contentHeight = text.height;
    const hasSize = contentWidth > 0 && contentHeight > 0;

    // 1) Scale (ignore transforms.size)
    const userScaleX = transforms.scaleX ?? 1;
    const userScaleY = transforms.scaleY ?? 1;

    root.scale.set(userScaleX, userScaleY);

    // 2) pivot (center)
    if (hasSize) {
      root.pivot.set(contentWidth / 2, contentHeight / 2);
    } else {
      root.pivot.set(0, 0);
    }

    // 3) position (top-left -> center)
    if (transforms.position) {
      if (hasSize) {
        root.x = transforms.position.x + (contentWidth * userScaleX) / 2;
        root.y = transforms.position.y + (contentHeight * userScaleY) / 2;
      } else {
        root.x = transforms.position.x;
        root.y = transforms.position.y;
      }
    }

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

  protected createTextContent(): void {
    if (this.text) {
      this.text.destroy();
    }
    if (this.background) {
      this.background.destroy();
      this.background = null;
    }

    // 1. Create Text
    const shadow = this._data.textData.shadow;
    const fontSize = this._data.textData.fontSize;
    const style = new TextStyle({
      fontFamily: this._data.textData.fontFamily,
      fontSize: fontSize,
      fill: this._data.textData.color,
      align: this._data.textData.align ?? 'left',
      fontWeight: this._data.textData.bold ? 'bold' : 'normal',
      fontStyle: this._data.textData.italic ? 'italic' : 'normal',
      letterSpacing: this._data.textData.letterSpacing ?? 0,
      lineHeight: (this._data.textData.lineHeight ?? 1) * fontSize,
      stroke: this._data.textData.border?.color
        ? {
            color: this._data.textData.border.color,
            width: this._data.textData.border.width,
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

    this.text = new Text(this._data.textData.content, style);
    // Anchor defaults to 0 (top-left) now as requested
    this.text.anchor.set(0);

    // 2. Create Background (if needed)

    this.updateBackground();

    // 3. Add to Container (Order matters: Background -> Text)
    if (this.background) {
      this.container.addChild(this.background);
    }
    this.container.addChild(this.text);

    // 4. Create Selection Bounds
    this.updateSelectionBounds();

    // 5. Create Underline
    this.updateUnderline();
  }

  private updateContent(): void {
    if (!this.text) return;

    // Update Text Style
    const fontSize = this._data.textData.fontSize;
    this.text.text = this._data.textData.content;
    this.text.style.fontFamily = this._data.textData.fontFamily;
    this.text.style.fontSize = fontSize;
    this.text.style.fill = this._data.textData.color;
    this.text.style.align = this._data.textData.align ?? 'left';
    this.text.style.fontWeight = this._data.textData.bold ? 'bold' : 'normal';
    this.text.style.fontStyle = this._data.textData.italic
      ? 'italic'
      : 'normal';
    this.text.style.letterSpacing = this._data.textData.letterSpacing ?? 0;
    this.text.style.lineHeight =
      (this._data.textData.lineHeight ?? 1) * fontSize;

    if (this._data.textData.border) {
      this.text.style.stroke = {
        color: this._data.textData.border.color,
        width: this._data.textData.border.width,
      };
    } else {
      // @ts-ignore - stroke type issue workaround
      this.text.style.stroke = undefined;
    }

    if (this._data.textData.shadow) {
      const shadow = this._data.textData.shadow;
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
    const bgData = this._data.textData.background;

    if (bgData && typeof bgData === 'object') {
      if (!this.background) {
        this.background = new Graphics();
        this.container.addChildAt(this.background, 0);
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
      this.container.addChild(this.selectionBounds);
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
    const underlineEnabled = this._data.textData.underline ?? false;

    if (underlineEnabled) {
      if (!this.underline) {
        this.underline = new Graphics();
        this.container.addChild(this.underline);
      }

      this.underline.clear();

      if (!this.text) return;

      const textWidth = this.text.width;
      const textHeight = this.text.height;
      const fontSize = this._data.textData.fontSize;
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
        color: this._data.textData.color,
      });
    } else {
      if (this.underline) {
        this.underline.destroy();
        this.underline = null;
      }
    }
  }
}
