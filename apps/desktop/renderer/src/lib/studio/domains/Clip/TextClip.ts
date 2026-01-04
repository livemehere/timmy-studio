import { Text, TextStyle } from 'pixi.js';
import type { ITextClip, ITransform } from './types';
import { GraphicClip } from './GraphicClip';
import type { GraphicRenderer } from '@renderer/lib/studio/engine/GraphicRenderer';
import type { TickContext } from '@renderer/lib/studio/engine/types';

export class TextClip extends GraphicClip {
  readonly type = 'text';
  public data: ITextClip;
  private text: Text | null = null;

  constructor(renderer: GraphicRenderer, data: ITextClip) {
    super(renderer, data);
    this.data = data;
  }

  async init(): Promise<void> {
    this.createText();
    this.applyTransform(this.data.transforms);
  }

  update(data: ITextClip): void {
    const prevData = this.data;
    this.data = data;

    // 데이터가 변경되었으므로 텍스트 업데이트
    if (this.shouldRecreateText(prevData, data)) {
      this.createText();
    } else {
      this.updateTextStyle();
    }

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
    // For TextClip, we apply anchor to the text child, because the wrapper sprite has no texture/dimensions.
    // The wrapper acts as the positioning container.
    if (this.text) {
      this.text.anchor.set(
        transforms.anchorX ?? 0.5,
        transforms.anchorY ?? 0.5
      );
    }

    // 2) position
    if (transforms.position) {
      sprite.x = transforms.position.x;
      sprite.y = transforms.position.y;
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

  private createText(): void {
    if (this.text) {
      this.text.destroy();
    }

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
      dropShadow: this.data.textData.shadow
        ? {
            color: this.data.textData.shadow.color,
            blur: this.data.textData.shadow.blur,
            angle: Math.PI / 4,
            distance: 6,
            alpha: 1, // Required by TextDropShadow type
          }
        : undefined,
      wordWrap: true,
      wordWrapWidth: this.data.transforms?.size?.width ?? 150, // 텍스트 래핑 너비 안전 처리
    });

    this.text = new Text({
      text: this.data.textData.content,
      style,
    });
    // Anchor is managed in applyTransform, but we set a default here just in case
    this.text.anchor.set(0.5);

    this.sprite.addChild(this.text);
  }

  private updateTextStyle(): void {
    if (!this.text) return;

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
      this.text.style.dropShadow = {
        color: this.data.textData.shadow.color,
        blur: this.data.textData.shadow.blur,
        angle: Math.PI / 4,
        distance: 6,
        alpha: 1,
      };
    } else {
      this.text.style.dropShadow = false;
    }

    // Update Word Wrap
    this.text.style.wordWrap = true;
    this.text.style.wordWrapWidth = this.data.transforms?.size?.width ?? 150;
  }

  private shouldRecreateText(prev: ITextClip, next: ITextClip): boolean {
    // Optimization: Only recreate if necessary properties change.
    // For now, return false and rely on updateTextStyle which covers most cases.
    if (!prev || !next) return false;
    return false;
  }
}
