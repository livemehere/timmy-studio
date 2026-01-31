import { Container } from 'pixi.js';
import type { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import { Clip } from '../Clip';
import type { TickContext } from '@/lib/studio/engine/types';
import type {
  IGraphicClip,
  ITransform,
  PlacementPreset,
  PlacementResult,
  Size,
} from '../types';

export abstract class GraphicClip extends Clip<IGraphicClip, GraphicRenderer> {
  // pivot, position, rotation, alpha, zIndex 담당
  public container: Container;

  static readonly ASSET_PLACEMENT_PRESETS = {
    containCenter: { fit: 'contain', alignX: 'center', alignY: 'center' },

    // Vertical align (top/middle/bottom)
    containTop: { fit: 'contain', alignX: 'center', alignY: 'top' },
    containBottom: { fit: 'contain', alignX: 'center', alignY: 'bottom' },

    // Horizontal align (left/center/right)
    containLeft: { fit: 'contain', alignX: 'left', alignY: 'center' },
    containRight: { fit: 'contain', alignX: 'right', alignY: 'center' },

    // Fit by one axis (keep aspect)
    fitWidthCenter: { fit: 'fitWidth', alignX: 'center', alignY: 'center' },
    fitHeightCenter: { fit: 'fitHeight', alignX: 'center', alignY: 'center' },

    // Fill
    coverCenter: { fit: 'cover', alignX: 'center', alignY: 'center' },
    stretch: { fit: 'stretch', alignX: 'center', alignY: 'center' },
  } as const satisfies Record<string, PlacementPreset>;

  protected constructor(renderer: GraphicRenderer, data: IGraphicClip) {
    super(renderer, data);
    this.debugCall('(Graphic) constructor');
    this.container = new Container();
    this.container.label = `ClipRoot-${this.id}`;
  }

  mount(parent: Container) {
    this.debugCall('(Graphic) mount');
    parent.addChild(this.container);
  }

  unmount() {
    this.debugCall('(Graphic) unmount');
    this.container.parent?.removeChild(this.container);
  }

  sync(newData: IGraphicClip): void {
    this.debugCall('(Graphic) sync');
    this._data = newData;
    this.applyData();
    this.applyTransform(this.data.transforms);
  }

  onBecameVisible(_ctx: TickContext): void {
    this.debugCall('(Graphic) onBecameVisible');
    this.container.visible = true;
  }

  onBecameHidden(_ctx: TickContext): void {
    this.debugCall('(Graphic) onBecameHidden');
    this.container.visible = false;
  }

  onTick(_ctx: TickContext): void {
    // 애니메이션/트랜지션이 필요할 때만 여기서 처리
  }

  // 각 Clip 유형별로 콘텐츠 크기 반환
  protected abstract getContentSize(): { width: number; height: number };
  // 기본 scale 계산 여부 (TextClip은 false)
  protected abstract shouldApplyBaseScale(): boolean;

  /** 🔥 실시간 미리보기용 - store 거치지 않고 직접 transform 적용 */
  public applyTransform(transforms: ITransform): void {
    const root = this.container;
    const { width: contentWidth, height: contentHeight } =
      this.getContentSize();

    let scaleX = 1;
    let scaleY = 1;

    if (this.shouldApplyBaseScale()) {
      // baseScale (size -> scale)
      const baseScaleX = transforms.size.width / contentWidth;
      const baseScaleY = transforms.size.height / contentHeight;
      // userScale
      const userScaleX = transforms.scaleX ?? 1;
      const userScaleY = transforms.scaleY ?? 1;
      scaleX = baseScaleX * userScaleX;
      scaleY = baseScaleY * userScaleY;
    } else {
      // userScale only (TextClip 경우)
      scaleX = transforms.scaleX ?? 1;
      scaleY = transforms.scaleY ?? 1;
    }

    this.container.scale.set(scaleX, scaleY);

    root.pivot.set(contentWidth / 2, contentHeight / 2);

    // 3) position (top-left -> center)
    root.x = transforms.position.x + (contentWidth * scaleX) / 2;
    root.y = transforms.position.y + (contentHeight * scaleY) / 2;

    root.rotation = transforms.rotation;
    root.alpha = transforms.opacity;
  }

  static computePlacement({
    total,
    target,
    preset,
  }: {
    total: Size;
    target: Size;
    preset: PlacementPreset;
  }): PlacementResult {
    const totalW = Number(total.width);
    const totalH = Number(total.height);
    const targetW = Number(target.width);
    const targetH = Number(target.height);

    if (
      !Number.isFinite(totalW) ||
      !Number.isFinite(totalH) ||
      !Number.isFinite(targetW) ||
      !Number.isFinite(targetH) ||
      totalW <= 0 ||
      totalH <= 0 ||
      targetW <= 0 ||
      targetH <= 0
    ) {
      return {
        position: { x: 0, y: 0 },
        size: {
          width: Math.max(0, totalW || 0),
          height: Math.max(0, totalH || 0),
        },
      };
    }

    let width = total.width;
    let height = total.height;

    switch (preset.fit) {
      case 'original': {
        width = targetW;
        height = targetH;
        break;
      }
      case 'stretch': {
        width = totalW;
        height = totalH;
        break;
      }
      case 'fitWidth': {
        width = totalW;
        height = (totalW * targetH) / targetW;
        break;
      }
      case 'fitHeight': {
        height = totalH;
        width = (totalH * targetW) / targetH;
        break;
      }
      case 'contain': {
        const scale = Math.min(totalW / targetW, totalH / targetH);
        width = targetW * scale;
        height = targetH * scale;
        break;
      }
      case 'cover': {
        const scale = Math.max(totalW / targetW, totalH / targetH);
        width = targetW * scale;
        height = targetH * scale;
        break;
      }
    }

    const rawX =
      preset.alignX === 'left'
        ? 0
        : preset.alignX === 'center'
          ? (totalW - width) / 2
          : totalW - width;

    const rawY =
      preset.alignY === 'top'
        ? 0
        : preset.alignY === 'center'
          ? (totalH - height) / 2
          : totalH - height;

    const x = Math.min(Math.max(0, rawX), totalW - width);
    const y = Math.min(Math.max(0, rawY), totalH - height);

    return {
      position: { x, y },
      size: { width, height },
    };
  }

  destroy(): void {
    this.debugCall('(Graphic) destroy');
    this.container.destroy(true);
  }
}
