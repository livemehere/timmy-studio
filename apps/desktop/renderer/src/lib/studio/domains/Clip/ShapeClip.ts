import type { IGraphicClip } from './types';
import { Clip } from './Clip';
import type { Renderer } from '@renderer/lib/studio/core/Renderer';
import type { TickContext } from '@renderer/lib/studio/core/types';

export class ShapeClip extends Clip {
  readonly type = 'shape';

  constructor(renderer: Renderer, data: IGraphicClip) {
    super(renderer, data);
  }

  async init(): Promise<void> {
    console.log('ShapeClip init called', this.data);
    // Placeholder implementation
  }

  update(data: IGraphicClip): void {
    this.data = data;
    console.log('ShapeClip update called', data);
  }

  destroy(): void {
    console.log('ShapeClip destroy called', this.id);
  }

  tick(_ctx: TickContext): void {
    // console.log('ShapeClip tick called', ctx);
  }
}
