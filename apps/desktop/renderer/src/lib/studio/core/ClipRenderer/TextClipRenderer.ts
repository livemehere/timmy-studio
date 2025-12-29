import { Container } from 'pixi.js';
import type { ITextClip } from '../../domains/Clip/types';
import type { Renderer } from '../Renderer';
import type { TickContext } from '../types';
import { ClipRenderer } from './ClipRenderer';

export class TextClipRenderer extends ClipRenderer<ITextClip> {
  readonly type = 'text';

  constructor(renderer: Renderer) {
    super(renderer);
  }

  async add(clip: ITextClip, _container: Container): Promise<void> {
    // Placeholder for Text implementation
    console.log('TextClipRenderer add called', clip);
  }

  update(clip: ITextClip): void {
    console.log('TextClipRenderer update called', clip);
  }

  remove(clipId: string): void {
    console.log('TextClipRenderer remove called', clipId);
  }

  tick(_ctx: TickContext): void {
    // console.log('TextClipRenderer tick called', ctx);
  }
}
