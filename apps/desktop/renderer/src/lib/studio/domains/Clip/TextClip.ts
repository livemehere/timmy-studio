import type { ITextClip } from './types';
import { Clip } from './Clip';
import type { Renderer } from '@renderer/lib/studio/engine/Renderer';
import type { TickContext } from '@renderer/lib/studio/engine/types';

export class TextClip extends Clip {
  readonly type = 'text';
  public data: ITextClip;

  constructor(renderer: Renderer, data: ITextClip) {
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
