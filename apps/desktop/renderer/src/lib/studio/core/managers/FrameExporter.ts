import { Application, Rectangle } from 'pixi.js';
import type { DocGetter } from '../types';

export class FrameExporter {
  constructor(
    private app: Application,
    private docGetter: DocGetter
  ) {}

  /** 현재 캔버스 화면을 HTMLCanvasElement로 추출합니다. */
  async exportCurrentFrame(): Promise<HTMLCanvasElement> {
    const canvas = this.app.renderer.extract.canvas(this.app.stage);
    return canvas as unknown as HTMLCanvasElement;
  }

  /** 현재 화면의 픽셀 데이터를 Uint8Array로 추출합니다. */
  exportCurrentPixels(): { width: number; height: number; data: Uint8Array } {
    const { settings } = this.docGetter();
    const width = settings.width;
    const height = settings.height;

    const out = this.app.renderer.extract.pixels({
      target: this.app.stage,
      frame: new Rectangle(0, 0, width, height),
      resolution: 1,
    });

    const data = new Uint8Array(
      out.pixels.buffer,
      out.pixels.byteOffset,
      out.pixels.byteLength
    );

    const expectedBytes = width * height * 4;
    if (data.byteLength !== expectedBytes) {
      throw new Error(
        `[FrameExporter] 바이트 길이 불일치: 결과 ${data.byteLength}, 예상 ${expectedBytes}`
      );
    }

    return { width, height, data };
  }
}
