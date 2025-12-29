import type {
  ClipType,
  IGraphicClip,
  ITextClip,
  IVideoClip,
} from '../../domains/Clip/types';
import type { Renderer, TickContext } from '../Renderer';
import type { Container } from 'pixi.js';

export abstract class ClipRenderer<T extends IGraphicClip> {
  abstract readonly type: ClipType;
  protected constructor(public readonly renderer: Renderer) {}

  abstract add(clip: T, trackContainer: Container): Promise<void>;
  abstract update(clip: T): void;
  abstract remove(clipId: string): void;
  abstract tick(ctx: TickContext): void;
}

export class VideoClipRenderer extends ClipRenderer<IVideoClip> {
  readonly type = 'video';

  constructor(public readonly renderer: Renderer) {
    super(renderer);
  }

  add(clip: IGraphicClip, container: Container): Promise<void> {
    console.log('VideoClipRenderer add called', clip);
    console.log('Container:', container);
    throw new Error('Method not implemented.');
  }
  update(clip: IGraphicClip): void {
    console.log('VideoClipRenderer update called', clip);
    throw new Error('Method not implemented.');
  }
  remove(clipId: string): void {
    console.log('VideoClipRenderer remove called', clipId);
    throw new Error('Method not implemented.');
  }

  tick(ctx: TickContext): void {
    console.log('VideoClipRenderer tick called', ctx);
    throw new Error('Method not implemented.');
  }
}

export class ImageClipRenderer extends ClipRenderer<IGraphicClip> {
  readonly type = 'image';

  constructor(public readonly renderer: Renderer) {
    super(renderer);
  }

  add(clip: IGraphicClip, container: Container): Promise<void> {
    console.log('ImageClipRenderer add called', clip);
    console.log('Container:', container);
    throw new Error('Method not implemented.');
  }
  update(clip: IGraphicClip): void {
    console.log('ImageClipRenderer update called', clip);
    throw new Error('Method not implemented.');
  }
  remove(clipId: string): void {
    console.log('ImageClipRenderer remove called', clipId);
    throw new Error('Method not implemented.');
  }

  tick(ctx: TickContext): void {
    console.log('ImageClipRenderer tick called', ctx);
    throw new Error('Method not implemented.');
  }
}

export class TextClipRenderer extends ClipRenderer<ITextClip> {
  readonly type = 'text';

  constructor(public readonly renderer: Renderer) {
    super(renderer);
  }

  add(clip: ITextClip, container: Container): Promise<void> {
    console.log('TextClipRenderer add called', clip);
    console.log('Container:', container);
    throw new Error('Method not implemented.');
  }
  update(clip: ITextClip): void {
    console.log('TextClipRenderer update called', clip);
    throw new Error('Method not implemented.');
  }
  remove(clipId: string): void {
    console.log('TextClipRenderer remove called', clipId);
    throw new Error('Method not implemented.');
  }

  tick(ctx: TickContext): void {
    console.log('TextClipRenderer tick called', ctx);
    throw new Error('Method not implemented.');
  }
}

export class ShapeClipRenderer extends ClipRenderer<IGraphicClip> {
  readonly type = 'shape';

  constructor(public readonly renderer: Renderer) {
    super(renderer);
  }

  add(clip: IGraphicClip, container: Container): Promise<void> {
    console.log('ShapeClipRenderer add called', clip);
    console.log('Container:', container);
    throw new Error('Method not implemented.');
  }
  update(clip: IGraphicClip): void {
    console.log('ShapeClipRenderer update called', clip);
    throw new Error('Method not implemented.');
  }
  remove(clipId: string): void {
    console.log('ShapeClipRenderer remove called', clipId);
    throw new Error('Method not implemented.');
  }

  tick(ctx: TickContext): void {
    console.log('ShapeClipRenderer tick called', ctx);
    throw new Error('Method not implemented.');
  }
}
