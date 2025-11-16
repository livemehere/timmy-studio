import type {
  IAnimation,
  IEffect,
  ITransform,
  IVideoClipBase,
} from '@renderer/lib/studio/types';
import { Container, Graphics, Text } from 'pixi.js';
import type { Timer } from '@renderer/lib/studio/core/Timer';

export abstract class BaseVideoClip implements IVideoClipBase {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  transforms: ITransform;
  effects?: IEffect[];
  animations?: IAnimation[];

  /* instance */
  protected readonly container: Container;
  protected placeholder?: Container;

  protected abstract getLabel(id: string): string;
  protected abstract update(timer: Timer): void;

  protected constructor(props: IVideoClipBase) {
    this.id = props.id;
    this.name = props.name;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.effects = props.effects;
    this.animations = props.animations;
    this.transforms = props.transforms;

    this.container = new Container();
    this.container.label = this.getLabel(this.id);
  }

  protected appendTo(parent: Container) {
    parent.addChild(this.container);
  }

  protected tick(timer: Timer) {
    const currentTime = timer.currentMs;
    if (currentTime >= this.startTime && currentTime <= this.endTime) {
      this.show();
      this.update(timer);
    } else {
      this.hide();
    }
  }

  protected show() {
    if (this.container.visible) return;
    this.container.visible = true;
  }

  protected hide() {
    if (!this.container.visible) return;
    this.container.visible = false;
  }

  protected destroy() {
    this.container.destroy(true);
  }

  protected applyTransforms() {
    const {
      position,
      size,
      scaleX,
      scaleY,
      opacity,
      rotation,
      anchorX,
      anchorY,
    } = this.transforms;
    if (anchorX != null) {
      this.container.pivot.x = anchorX;
    }
    if (anchorY != null) {
      this.container.pivot.y = anchorY;
    }
    this.container.position.set(position?.x || 0, position?.y || 0);
    if (size) {
      this.container.width = size.width;
      this.container.height = size.height;
    }
    this.container.scale.set(scaleX ?? 1, scaleY ?? 1);
    this.container.rotation = rotation ?? 0;
    this.container.alpha = opacity ?? 1;
  }

  protected showPlaceholder() {
    /* 이미 있으면 종료 */
    if (this.placeholder) return;

    /* placeholder box */
    this.placeholder = new Container();

    const box = new Graphics();
    const { width, height } = this.transforms.size || {
      width: 100,
      height: 100,
    };
    box.rect(0, 0, width, height).fill(0x333333).stroke(0x666666);

    const text = new Text({
      text: this.name,
      style: {
        fontSize: width / 12,
        fill: 0xffffff,
        align: 'center',
      },
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);

    this.placeholder.addChild(box);
    this.placeholder.addChild(text);
    this.container.addChild(this.placeholder);
  }

  protected removePlaceholder() {
    if (
      this.placeholder &&
      this.container.getChildIndex(this.placeholder) !== -1
    ) {
      this.container.removeChild(this.placeholder);
      this.placeholder.destroy();
      this.placeholder = undefined;
    }
  }
}
