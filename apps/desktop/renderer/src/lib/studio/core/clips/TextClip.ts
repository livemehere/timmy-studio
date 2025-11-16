import type {
  ITextClip,
  ITextData,
  ITransform,
} from '@renderer/lib/studio/types';
import { Container, Graphics, Text } from 'pixi.js';
import { BehaviorSubject, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import isEqual from 'fast-deep-equal';

export class TextClip implements ITextClip {
  type: 'text' = 'text';
  id: string;
  name: string;

  startTime: number;
  endTime: number;

  // Public getters/setters to maintain interface compatibility
  get textData(): ITextData {
    return this.textData$.value;
  }

  set textData(value: ITextData) {
    this.textData$.next(value);
  }

  get transforms(): ITransform {
    return this.transforms$.value;
  }

  set transforms(value: ITransform) {
    this.transforms$.next(value);
  }

  // Internal reactive state
  private readonly textData$: BehaviorSubject<ITextData>;
  private readonly transforms$: BehaviorSubject<ITransform>;

  private readonly container: Container;
  private text: Text;
  private background?: Graphics;
  private readonly subscriptions: Subscription = new Subscription();

  constructor(props: ITextClip) {
    this.id = props.id;
    this.name = props.name;

    this.startTime = props.startTime;
    this.endTime = props.endTime;

    // Initialize reactive state
    this.textData$ = new BehaviorSubject<ITextData>(props.textData);
    this.transforms$ = new BehaviorSubject<ITransform>(props.transforms);

    this.container = new Container();
    this.container.label = `TextClip-${this.id}`;

    this.text = this.createText();
    this.container.addChild(this.text);

    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // Subscribe to textData changes to update text
    this.subscriptions.add(
      this.textData$
        .pipe(distinctUntilChanged(isEqual))
        .subscribe((textData) => {
          this.updateText(textData);
        })
    );

    // Subscribe to transforms changes to update container
    this.subscriptions.add(
      this.transforms$
        .pipe(distinctUntilChanged(isEqual))
        .subscribe((transforms) => {
          this.applyTransforms(transforms);
        })
    );
  }

  private createText() {
    const text = new Text();
    this.updateTextStyle(text, this.textData);
    return text;
  }

  private updateText(textData: ITextData) {
    // Update text style
    this.updateTextStyle(this.text, textData);

    // Update background if needed
    this.updateBackground(textData);

    // Reapply transforms as anchor might depend on text size
    this.applyTransforms(this.transforms);
  }

  private updateTextStyle(text: Text, textData: ITextData) {
    text.text = textData.content;
    text.style = {
      fontFamily: textData.fontFamily,
      fontSize: textData.fontSize,
      fill: textData.color,
      align: textData.align,
      fontWeight: textData.bold ? 'bold' : 'normal',
      fontStyle: textData.italic ? 'italic' : 'normal',
      dropShadow: textData.shadow
        ? {
            color: textData.shadow.color,
            blur: textData.shadow.blur,
            distance: Math.sqrt(
              textData.shadow.offsetX ** 2 + textData.shadow.offsetY ** 2
            ),
            angle: Math.atan2(
              textData.shadow.offsetY,
              textData.shadow.offsetX
            ),
          }
        : undefined,
    };

    // Handle text decoration (underline)
    if (textData.underline) {
      text.style.textDecoration = 'underline';
    }
  }

  private updateBackground(textData: ITextData) {
    // Remove old background if exists
    if (this.background) {
      this.container.removeChild(this.background);
      this.background.destroy();
      this.background = undefined;
    }

    // Create new background if needed
    if (textData.background || textData.border) {
      const padding = this.getPadding(textData.padding);
      const bgWidth = this.text.width + padding.left + padding.right;
      const bgHeight = this.text.height + padding.top + padding.bottom;

      this.background = new Graphics();

      // Draw background with optional border radius
      const radius = textData.border?.radius ?? 0;

      if (textData.background) {
        this.background.roundRect(0, 0, bgWidth, bgHeight, radius);
        this.background.fill({ color: textData.background });
      }

      if (textData.border) {
        this.background.roundRect(0, 0, bgWidth, bgHeight, radius);
        this.background.stroke({
          width: textData.border.width,
          color: textData.border.color,
        });
      }

      // Position text relative to background
      this.text.position.set(padding.left, padding.top);

      // Add background before text
      this.container.addChildAt(this.background, 0);
    } else {
      // Reset text position if no background
      this.text.position.set(0, 0);
    }
  }

  private getPadding(padding?: number | [number, number] | [number, number, number, number]): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    if (padding === undefined) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    if (typeof padding === 'number') {
      return { top: padding, right: padding, bottom: padding, left: padding };
    }

    if (padding.length === 2) {
      return { top: padding[0], right: padding[1], bottom: padding[0], left: padding[1] };
    }

    return { top: padding[0], right: padding[1], bottom: padding[2], left: padding[3] };
  }

  private applyTransforms(transforms: ITransform) {
    const { position, scaleX, scaleY, opacity, rotation, anchorX, anchorY } =
      transforms;

    // Calculate bounds for anchor
    const bounds = this.container.getLocalBounds();
    this.container.pivot.set(
      anchorX ?? bounds.width / 2,
      anchorY ?? bounds.height / 2
    );
    this.container.position.set(position.x, position.y);
    this.container.scale.set(scaleX ?? 1, scaleY ?? 1);
    this.container.rotation = rotation ?? 0;
    this.container.alpha = opacity ?? 1;
  }

  add(parent: Container) {
    parent.addChild(this.container);
  }

  update(_context: any) {
    // No-op: All updates are handled reactively via subscriptions
    // This method exists only to satisfy the interface contract
  }

  show() {
    if (this.container.visible) return;
    this.container.visible = true;
  }

  hide() {
    if (!this.container.visible) return;
    this.container.visible = false;
  }

  destroy() {
    // Unsubscribe from all observables
    this.subscriptions.unsubscribe();

    // Complete subjects
    this.textData$.complete();
    this.transforms$.complete();

    // Destroy graphics and container
    this.container.destroy({ children: true });
  }
}
