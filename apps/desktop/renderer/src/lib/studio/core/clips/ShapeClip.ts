import type {
  IShapeClip,
  IShapeData,
  ITransform,
} from '@renderer/lib/studio/types';
import { Container, Graphics } from 'pixi.js';

export class ShapeClip implements IShapeClip {
  type: 'shape' = 'shape';
  id: string;
  name: string;

  startTime: number;
  endTime: number;

  shapeData: IShapeData;
  transforms: ITransform;

  private readonly container: Container;
  private readonly graphics: Graphics;

  static getLabel(id: string) {
    return `ShapeClip-${id}`;
  }

  constructor(props: IShapeClip) {
    this.id = props.id;
    this.name = props.name;

    this.startTime = props.startTime;
    this.endTime = props.endTime;

    this.shapeData = props.shapeData;
    this.transforms = props.transforms;

    this.container = new Container();
    this.container.label = ShapeClip.getLabel(this.id);
    this.applyTransforms();

    this.graphics = this.createShape();
    this.container.addChild(this.graphics);
  }

  private createShape() {
    const graphics = new Graphics();
    const shapeData = this.shapeData;

    switch (shapeData.shapeType) {
      case 'rectangle':
        graphics
          .rect(0, 0, shapeData.width, shapeData.height)
          .fill({ color: shapeData.color })
          .stroke({
            width: shapeData.border?.width || 0,
            color: shapeData.border?.color || 0x000000,
          });
        break;
      // Future shape types can be handled here
      default:
        throw new Error(`Unsupported shape type: ${shapeData.shapeType}`);
    }

    return graphics;
  }

  appendTo(parent: Container) {
    parent.addChild(this.container);
  }

  private updateTransforms(time: number) {
    // TODO: Implement transform animations over time
  }

  private applyTransforms() {
    const { position, scaleX, scaleY, opacity, rotation, anchorX, anchorY } =
      this.transforms;
    this.container.pivot.set(
      anchorX ?? this.shapeData.width / 2,
      anchorY ?? this.shapeData.height / 2
    );
    this.container.position.set(position.x, position.y);
    this.container.scale.set(scaleX ?? 1, scaleY ?? 1);
    this.container.rotation = rotation ?? 0;
    this.container.alpha = opacity ?? 1;
  }

  update(currentTime: number) {
    this.updateTransforms(currentTime);
    this.applyTransforms();
  }

  show() {
    if (this.container.visible) return;
    this.container.visible = true;
  }

  hide() {
    if (!this.container.visible) return;
    this.container.visible = false;
  }
}
