import type { IVideoClip, IVideoTrack } from '@renderer/lib/studio/types';
import { ShapeClip } from '@renderer/lib/studio/core/clips/ShapeClip';
import { Container } from 'pixi.js';
import { VideoClip } from '../clips/VideoClip';
import type { AssetManager } from '@renderer/lib/studio/core/AssetManager';
import type { Timer } from '@renderer/lib/studio/core/Timer';

export class VideoTrack implements IVideoTrack {
  type: 'video' = 'video';
  id: string;
  name: string;
  locked: boolean;
  clips = new Map<string, ShapeClip | VideoClip>();

  readonly container: Container;
  private readonly assetManager: AssetManager;

  static getLabel(id: string) {
    return `VideoTrack-${id}`;
  }

  get enabled() {
    return this.container.visible;
  }

  set enabled(value: boolean) {
    this.container.visible = value;
  }

  get opacity() {
    return this.container.alpha;
  }

  set opacity(value: number) {
    this.container.alpha = value;
  }

  get zIndex() {
    return this.container.zIndex;
  }

  set zIndex(value: number) {
    this.container.zIndex = value;
  }

  constructor(data: IVideoTrack, assetManager: AssetManager) {
    this.assetManager = assetManager;

    this.container = new Container();
    this.container.label = VideoTrack.getLabel(data.id);

    this.id = data.id;
    this.locked = data.locked;
    this.name = data.name;
    this.enabled = data.enabled;
    this.opacity = data.opacity;
    this.zIndex = data.zIndex;

    data.clips.forEach((clipData) => {
      const clip = this.instantiateClip(clipData);
      clip.appendTo(this.container);
      this.clips.set(clipData.id, clip);
    });
  }

  appendTo(parent: Container) {
    parent.addChild(this.container);
  }

  getClip(clipId: string) {
    return this.clips.get(clipId);
  }

  getClipContainer(clipId: string): Container | undefined {
    return this.clips.get(clipId)?.container;
  }

  addClip(clipData: IVideoClip) {
    if (this.clips.has(clipData.id)) {
      console.warn(`[VideoTrack] Clip ${clipData.id} already exists`);
      return;
    }
    const clip = this.instantiateClip(clipData);
    clip.appendTo(this.container);
    this.clips.set(clipData.id, clip);
  }

  removeClip(clipId: string) {
    const clip = this.clips.get(clipId);
    if (clip) {
      clip.destroy?.();
      this.clips.delete(clipId);
    }
  }

  setClipZIndex(clipId: string, zIndex: number) {
    const clip = this.clips.get(clipId);
    if (clip?.container) {
      clip.container.zIndex = zIndex;
    }
  }

  private instantiateClip(props: IVideoClip) {
    if (props.type === 'shape') {
      return new ShapeClip(props);
    } else if (props.type === 'video') {
      return new VideoClip(props, this.assetManager);
    }
    throw new Error(`Unsupported clip type: ${props.type}`);
  }

  tick(timer: Timer) {
    if (this.enabled) {
      this.show();
      this.update(timer);
    } else {
      this.hide();
    }
  }

  private show() {
    if (this.container.visible) return;
    this.container.visible = true;
  }

  private hide() {
    if (!this.container.visible) return;
    this.container.visible = false;
  }

  private update(timer: Timer) {
    this.clips.forEach((clip) => clip.tick(timer));
  }

  destroy() {
    this.clips.forEach((clip) => clip.destroy?.());
    this.clips.clear();
    this.container.destroy();
  }
}
