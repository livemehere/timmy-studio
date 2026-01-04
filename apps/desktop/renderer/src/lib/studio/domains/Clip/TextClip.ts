import type { ITextClip } from './types';
import { GraphicClip } from './GraphicClip';
import type { GraphicRenderer } from '@renderer/lib/studio/engine/GraphicRenderer';
import type { TickContext } from '@renderer/lib/studio/engine/types';

export class TextClip extends GraphicClip {
  readonly type = 'text';
  public data: ITextClip;

  constructor(renderer: GraphicRenderer, data: ITextClip) {
    super(renderer, data);
    this.data = data;
  }

  async init(): Promise<void> {
    console.log('TextClip init called', this.data);
    // Placeholder implementation
  }

  update(data: ITextClip): void {
    this.data = data;
    console.log('TextClip update called', data);
  }

  destroy(): void {
    console.log('TextClip destroy called', this.id);
  }

  tick(_ctx: TickContext): void {
    // console.log('TextClip tick called', ctx);
  }
}
