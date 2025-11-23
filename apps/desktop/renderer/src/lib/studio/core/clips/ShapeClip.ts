import type { IShapeClip, IShapeData } from '@renderer/lib/studio/types';
import { Graphics } from 'pixi.js';
import type { Timer } from '@renderer/lib/studio/core/Timer';
import { BaseVideoClip } from '@renderer/lib/studio/core/clips/BaseVideoClip';

export class ShapeClip extends BaseVideoClip implements IShapeClip {
  type: 'shape' = 'shape';
  shapeData: IShapeData;

  private readonly shape: Graphics;

  protected getLabel(id: string) {
    return `ShapeClip-${id}`;
  }

  constructor(props: IShapeClip) {
    super(props);
    this.shapeData = props.shapeData;
    this.applyTransforms();
    this.shape = this.createShape();
    this.container.addChild(this.shape);
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

  protected update(timer: Timer) {
    this.applyTransforms();
  }
}
