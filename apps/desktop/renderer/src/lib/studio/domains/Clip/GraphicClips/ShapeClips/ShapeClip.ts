import type { IShapeClip } from '../../types';
import { GraphicClip } from '../GraphicClip';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import { Graphics, FillGradient } from 'pixi.js';

export class ShapeClip extends GraphicClip {
  readonly type = 'shape';
  declare protected _data: IShapeClip;

  private graphics: Graphics | null = null;

  protected getContentSize(): { width: number; height: number } {
    const width = this._data.shapeData.width;
    const height = this._data.shapeData.height;
    return { width, height };
  }

  constructor(renderer: GraphicRenderer, data: IShapeClip) {
    super(renderer, data);
    this.debugCall('(Shape) constructor');
  }

  async init(): Promise<void> {
    this.debugCall('(Shape) === init ===');

    // Graphics 객체 생성
    this.graphics = new Graphics();
    this.graphics.label = `ShapeClip-${this.id}`;

    // container에 graphics를 자식으로 추가
    this.container.addChild(this.graphics);

    this.sync(this.data);
    this.debugCall('(Shape) === init-end ===');
  }

  destroy(): void {
    this.debugCall('(Shape) destroy');
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    super.destroy();
  }

  protected shouldApplyBaseScale(): boolean {
    return true;
  }

  protected applyData(): void {
    if (!this.graphics) return;

    const shape = this._data.shapeData;
    const graphics = this.graphics;

    graphics.clear();

    // Prepare fill
    let fillStyle: any;
    if (shape.fill.type === 'solid') {
      const fillColor =
        typeof shape.fill.color === 'string'
          ? shape.fill.color
          : shape.fill.color;
      const fillAlpha = shape.fill.opacity ?? 1;
      fillStyle = { color: fillColor, alpha: fillAlpha };
    } else if (shape.fill.type === 'linear-gradient') {
      const gradient = new FillGradient({
        type: 'linear',
        start: { x: shape.fill.x0, y: shape.fill.y0 },
        end: { x: shape.fill.x1, y: shape.fill.y1 },
        colorStops: shape.fill.colorStops.map((stop) => ({
          offset: stop.offset,
          color: stop.color,
        })),
      });
      fillStyle = gradient;
    } else if (shape.fill.type === 'radial-gradient') {
      const gradient = new FillGradient({
        type: 'radial',
        center: { x: shape.fill.x0, y: shape.fill.y0 },
        innerRadius: shape.fill.radius0,
        outerCenter: { x: shape.fill.x1, y: shape.fill.y1 },
        outerRadius: shape.fill.radius1,
        colorStops: shape.fill.colorStops.map((stop) => ({
          offset: stop.offset,
          color: stop.color,
        })),
      });
      fillStyle = gradient;
    }

    // 도형 타입별 렌더링 - 체이닝 방식으로 fill 호출
    switch (shape.shapeType) {
      case 'rectangle':
        graphics.rect(0, 0, shape.width, shape.height);
        graphics.fill(fillStyle);
        break;

      case 'rounded-rectangle':
        graphics.roundRect(0, 0, shape.width, shape.height, shape.cornerRadius);
        graphics.fill(fillStyle);
        break;

      case 'circle': {
        const radius = Math.min(shape.width, shape.height) / 2;
        graphics.circle(shape.width / 2, shape.height / 2, radius);
        graphics.fill(fillStyle);
        break;
      }

      case 'ellipse':
        graphics.ellipse(
          shape.width / 2,
          shape.height / 2,
          shape.width / 2,
          shape.height / 2
        );
        graphics.fill(fillStyle);
        break;

      case 'polygon': {
        const sides = Math.max(3, shape.sides);
        const points = this.calculatePolygonPoints(
          shape.width / 2,
          shape.height / 2,
          Math.min(shape.width, shape.height) / 2,
          sides
        );
        graphics.poly(points);
        graphics.fill(fillStyle);
        break;
      }
    }

    // Stroke가 있으면 다시 도형을 그리고 stroke 적용
    if (shape.stroke) {
      const strokeColor =
        typeof shape.stroke.color === 'string'
          ? shape.stroke.color
          : shape.stroke.color;
      const strokeAlpha = shape.stroke.opacity ?? 1;

      // 도형을 다시 그리고 stroke 체이닝
      switch (shape.shapeType) {
        case 'rectangle':
          graphics.rect(0, 0, shape.width, shape.height);
          graphics.stroke({
            width: shape.stroke.width,
            color: strokeColor,
            alpha: strokeAlpha,
          });
          break;

        case 'rounded-rectangle':
          graphics.roundRect(
            0,
            0,
            shape.width,
            shape.height,
            shape.cornerRadius
          );
          graphics.stroke({
            width: shape.stroke.width,
            color: strokeColor,
            alpha: strokeAlpha,
          });
          break;

        case 'circle': {
          const radius = Math.min(shape.width, shape.height) / 2;
          graphics.circle(shape.width / 2, shape.height / 2, radius);
          graphics.stroke({
            width: shape.stroke.width,
            color: strokeColor,
            alpha: strokeAlpha,
          });
          break;
        }

        case 'ellipse':
          graphics.ellipse(
            shape.width / 2,
            shape.height / 2,
            shape.width / 2,
            shape.height / 2
          );
          graphics.stroke({
            width: shape.stroke.width,
            color: strokeColor,
            alpha: strokeAlpha,
          });
          break;

        case 'polygon': {
          const sides = Math.max(3, shape.sides);
          const points = this.calculatePolygonPoints(
            shape.width / 2,
            shape.height / 2,
            Math.min(shape.width, shape.height) / 2,
            sides
          );
          graphics.poly(points);
          graphics.stroke({
            width: shape.stroke.width,
            color: strokeColor,
            alpha: strokeAlpha,
          });
          break;
        }
      }
    }
  }

  private calculatePolygonPoints(
    centerX: number,
    centerY: number,
    radius: number,
    sides: number
  ): number[] {
    const points: number[] = [];
    const angleStep = (Math.PI * 2) / sides;
    // 시작 각도를 -90도로 설정하여 첫 번째 점이 위쪽에 오도록 함
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < sides; i++) {
      const angle = startAngle + angleStep * i;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      points.push(x, y);
    }

    return points;
  }
}
