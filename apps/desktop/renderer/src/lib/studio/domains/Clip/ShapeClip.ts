import type { IGraphicClip, IShapeClip, ITransform } from './types';
import { GraphicClip } from './GraphicClip';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import type { TickContext } from '@/lib/studio/engine/types';
import { Graphics, FillGradient } from 'pixi.js';

export class ShapeClip extends GraphicClip {
  readonly type = 'shape';
  private graphics: Graphics | null = null;

  constructor(renderer: GraphicRenderer, data: IShapeClip) {
    super(renderer, data);
  }

  get shapeData() {
    return (this._data as IShapeClip).shapeData;
  }

  async init(): Promise<void> {
    console.log('ShapeClip init called', this._data);

    // Graphics 객체 생성
    this.graphics = new Graphics();
    this.graphics.label = `ShapeClip-${this.id}`;

    // container에 graphics를 자식으로 추가
    this.container.addChild(this.graphics);

    this.applyEffects();
    this.applyTransform((this._data as IShapeClip).transforms);
  }

  protected applyEffects(): void {
    this.renderShape();
  }

  destroy(): void {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    this.container.destroy({ children: true });
    this.debugCall('destroy');
  }

  override onTick(ctx: TickContext): void {
    super.onTick(ctx);
  }

  protected onUpdateVisible(_currentTime: number): void {
    this.applyTransform((this._data as IShapeClip).transforms);
  }

  /**
   * ShapeClip 전용 transform 적용
   * shapeData의 width/height를 원본 크기로 간주하고,
   * transform.size에 맞게 스케일 적용
   */
  protected applyTransform(transforms: ITransform): void {
    const root = this.container;
    const shape = this.shapeData;
    const contentWidth = shape.width;
    const contentHeight = shape.height;
    const hasSize = contentWidth > 0 && contentHeight > 0;

    // 1) base scale (size -> scale)
    // shapeData의 width/height를 원본 크기로 간주
    let baseScaleX = 1;
    let baseScaleY = 1;

    if (transforms.size && hasSize) {
      baseScaleX = transforms.size.width / contentWidth;
      baseScaleY = transforms.size.height / contentHeight;
    }

    // 2) user scale
    const userScaleX = transforms.scaleX ?? 1;
    const userScaleY = transforms.scaleY ?? 1;

    const scaleX = baseScaleX * userScaleX;
    const scaleY = baseScaleY * userScaleY;

    root.scale.set(scaleX, scaleY);

    // 3) pivot (center)
    if (hasSize) {
      root.pivot.set(contentWidth / 2, contentHeight / 2);
    } else {
      root.pivot.set(0, 0);
    }

    // 4) position (top-left -> center)
    if (transforms.position) {
      if (hasSize) {
        root.x = transforms.position.x + (contentWidth * scaleX) / 2;
        root.y = transforms.position.y + (contentHeight * scaleY) / 2;
      } else {
        root.x = transforms.position.x;
        root.y = transforms.position.y;
      }
    }

    // 5) zIndex
    if ((this._data as IShapeClip).zIndex !== undefined) {
      root.zIndex = (this._data as IShapeClip).zIndex;
    }

    // 6) rotation / alpha
    if (transforms.rotation !== undefined) {
      root.rotation = transforms.rotation;
    }
    if (transforms.opacity !== undefined) {
      root.alpha = transforms.opacity;
    }
  }

  private renderShape(): void {
    if (!this.graphics) return;

    const shape = this.shapeData;
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
