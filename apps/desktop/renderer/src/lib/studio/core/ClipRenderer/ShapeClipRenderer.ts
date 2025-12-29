import { Container } from 'pixi.js';
import type { IGraphicClip } from '../../domains/Clip/types';
import type { Renderer } from '../Renderer';
import type { TickContext } from '../types';
import { ClipRenderer } from './ClipRenderer';

export class ShapeClipRenderer extends ClipRenderer<IGraphicClip> {
  readonly type = 'shape';

  constructor(renderer: Renderer) {
    super(renderer);
  }

  async add(clip: IGraphicClip, _container: Container): Promise<void> {
    console.log('ShapeClipRenderer add called', clip);
  }

  update(clip: IGraphicClip): void {
    console.log('ShapeClipRenderer update called', clip);
  }

  remove(clipId: string): void {
    console.log('ShapeClipRenderer remove called', clipId);
  }

  tick(_ctx: TickContext): void {
    // console.log('ShapeClipRenderer tick called', ctx);
  }
}
