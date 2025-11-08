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

  constructor(props: IShapeClip) {
    this.id = props.id;
    this.name = props.name;

    this.startTime = props.startTime;
    this.endTime = props.endTime;

    this.shapeData = props.shapeData;
    this.transforms = props.transforms;

    //todo: apply other transforms like scale, rotation, opacity, etc.
    this.container = new Container();
    this.container.label = `ShapeClip-${this.id}`;
    this.container.position.set(
      this.transforms.position.x,
      this.transforms.position.y
    );

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

  add(parent: Container) {
    parent.addChild(this.container);
  }

  update(currentTime: number) {
    // Update shape properties based on current time if needed
    console.log('update shape clip at', currentTime);
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
