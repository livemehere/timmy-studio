import type {
  IShapeClip,
  IShapeData,
  ITransform,
} from '@renderer/lib/studio/types';
import { Container, Graphics } from 'pixi.js';
import { BehaviorSubject, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import isEqual from 'fast-deep-equal';

export class ShapeClip implements IShapeClip {
  type: 'shape' = 'shape';
  id: string;
  name: string;

  startTime: number;
  endTime: number;

  // Public getters/setters to maintain interface compatibility
  get shapeData(): IShapeData {
    return this.shapeData$.value;
  }

  set shapeData(value: IShapeData) {
    this.shapeData$.next(value);
  }

  get transforms(): ITransform {
    return this.transforms$.value;
  }

  set transforms(value: ITransform) {
    this.transforms$.next(value);
  }

  // Internal reactive state
  private readonly shapeData$: BehaviorSubject<IShapeData>;
  private readonly transforms$: BehaviorSubject<ITransform>;

  private readonly container: Container;
  private graphics: Graphics;
  private readonly subscriptions: Subscription = new Subscription();

  constructor(props: IShapeClip) {
    this.id = props.id;
    this.name = props.name;

    this.startTime = props.startTime;
    this.endTime = props.endTime;

    // Initialize reactive state
    this.shapeData$ = new BehaviorSubject<IShapeData>(props.shapeData);
    this.transforms$ = new BehaviorSubject<ITransform>(props.transforms);

    this.container = new Container();
    this.container.label = `ShapeClip-${this.id}`;

    this.graphics = this.createShape();
    this.container.addChild(this.graphics);

    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // Subscribe to shapeData changes to update graphics
    this.subscriptions.add(
      this.shapeData$
        .pipe(distinctUntilChanged(isEqual))
        .subscribe((shapeData) => {
          this.updateGraphics(shapeData);
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

  private createShape() {
    const graphics = new Graphics();
    this.drawShape(graphics, this.shapeData);
    return graphics;
  }

  private updateGraphics(shapeData: IShapeData) {
    // Clear existing graphics and redraw with new data
    this.graphics.clear();
    this.drawShape(this.graphics, shapeData);

    // Reapply transforms as anchor might depend on shape size
    this.applyTransforms(this.transforms);
  }

  private drawShape(graphics: Graphics, shapeData: IShapeData) {
    switch (shapeData.shapeType) {
      case 'rectangle':
        graphics.rect(0, 0, shapeData.width, shapeData.height);
        break;

      case 'circle':
        // Circle uses radius, but we keep width/height for consistency
        // radius = min(width, height) / 2
        const radius = shapeData.radius ?? Math.min(shapeData.width, shapeData.height) / 2;
        const centerX = shapeData.width / 2;
        const centerY = shapeData.height / 2;
        graphics.circle(centerX, centerY, radius);
        break;

      case 'polygon':
        // For now, create a simple polygon (triangle, hexagon, etc.)
        // This is a placeholder - you can customize the polygon points
        const sides = 6; // hexagon by default
        const polygonRadius = Math.min(shapeData.width, shapeData.height) / 2;
        const polygonCenterX = shapeData.width / 2;
        const polygonCenterY = shapeData.height / 2;

        const points: number[] = [];
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2;
          points.push(
            polygonCenterX + Math.cos(angle) * polygonRadius,
            polygonCenterY + Math.sin(angle) * polygonRadius
          );
        }
        graphics.poly(points);
        break;

      default:
        throw new Error(`Unsupported shape type: ${shapeData.shapeType}`);
    }

    // Apply fill and stroke (common for all shapes)
    graphics.fill({ color: shapeData.color });

    if (shapeData.border) {
      graphics.stroke({
        width: shapeData.border.width,
        color: shapeData.border.color,
      });
    }
  }

  private applyTransforms(transforms: ITransform) {
    const { position, scaleX, scaleY, opacity, rotation, anchorX, anchorY } =
      transforms;

    const shapeData = this.shapeData;
    this.container.pivot.set(
      anchorX ?? shapeData.width / 2,
      anchorY ?? shapeData.height / 2
    );
    this.container.position.set(position.x, position.y);
    this.container.scale.set(scaleX ?? 1, scaleY ?? 1);
    this.container.rotation = rotation ?? 0;
    this.container.alpha = opacity ?? 1;
  }

  add(parent: Container) {
    parent.addChild(this.container);
  }

  update(_currentTime: number) {
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
    this.shapeData$.complete();
    this.transforms$.complete();

    // Destroy graphics and container
    this.container.destroy({ children: true });
  }
}
