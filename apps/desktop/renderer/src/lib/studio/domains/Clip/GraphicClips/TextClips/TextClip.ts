import { Text, TextStyle, Graphics } from 'pixi.js';
import type { ITextClip } from '../../types';
import type { ITextData } from '@/lib/studio/types/text';
import { GraphicClip } from '../GraphicClip';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';

export class TextClip extends GraphicClip {
  readonly type = 'text';
  declare protected _data: ITextClip;

  private text: Text | null = null;
  private background: Graphics | null = null;
  private selectionBounds: Graphics | null = null; // 선택 영역 표시용
  private underline: Graphics | null = null; // 언더라인 표시용

  public getContentSize(): { width: number; height: number } {
    const width = this.text?.width ?? 0;
    const height = this.text?.height ?? 0;
    return { width, height };
  }

  constructor(renderer: GraphicRenderer, data: ITextClip) {
    super(renderer, data);
    this.debugCall(`(Text) constructor`);
  }

  async init(): Promise<void> {
    this.debugCall('(Text) === init ===');
    this.createTextObject();
    this.sync(this.data);
    this.debugCall('(Text) === init-end ===');
  }

  destroy(): void {
    this.debugCall('(Text) destroy');
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
    super.destroy();
  }

  protected applyData(): void {
    this.debugCall('applyData');
    this.updateContent();
    this.syncTransformsSize();
    this.updateSelectionBounds();
  }

  /**
   * 🔥 실시간 미리보기용 — store/sync 파이프라인을 우회하여 textData 만 직접 반영.
   * Properties 패널에서 debounce commit 전에 실시간 프리뷰를 위해 사용.
   */
  applyTextPreview(textData: ITextData): void {
    this._data = { ...this._data, textData };
    this.updateContent();
    this.syncTransformsSize();
    this.applyTransform(this._data.transforms);
    // 즉시 렌더링하여 프리뷰 반영 (auto-render tick 대기 없이)
    this.renderer.renderOnce();
  }

  /**
   * 텍스트 렌더 후 실제 Pixi 텍스트 크기를 transforms.size 에 반영.
   * TransformOverlay 가 size × scale 로 박스를 그리기 때문에
   * 항상 실제 텍스트 크기와 일치해야 한다.
   */
  private syncTransformsSize(): void {
    if (!this.text) return;
    const w = this.text.width;
    const h = this.text.height;
    if (w > 0 && h > 0) {
      this._data = {
        ...this._data,
        transforms: {
          ...this._data.transforms,
          size: { width: w, height: h },
        },
      };
    }
  }

  public shouldApplyBaseScale(): boolean {
    return false; // TextClip은 userScale만 사용
  }

  private createTextObject(): void {
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

    if (this._data.textData.border && this._data.textData.border.width > 0) {
      this.text.style.stroke = {
        color: this._data.textData.border.color,
        width: this._data.textData.border.width,
      };
    } else {
      (this.text.style as any).stroke = null;
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
      (this.text.style as any).dropShadow = null;
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

      // 멀티라인 지원: 각 줄 별로 underline 그리기
      const lines = this._data.textData.content.split('\n');
      const lineCount = lines.length;
      const lineHeightMul = this._data.textData.lineHeight ?? 1;
      const lineHeight = lineHeightMul * fontSize;
      const underlineThickness = Math.max(1, fontSize * 0.05);

      const startX = -(textWidth * anchorX);
      const endX = textWidth - textWidth * anchorX;

      for (let i = 0; i < lineCount; i++) {
        // baseline ≈ lineTop + fontSize * 0.85 (ascent + 약간의 offset)
        const lineTopY = i * lineHeight;
        const underlineY = lineTopY + fontSize * 0.85 - textHeight * anchorY;

        this.underline.moveTo(startX, underlineY);
        this.underline.lineTo(endX, underlineY);
      }

      this.underline.stroke({
        width: underlineThickness,
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
