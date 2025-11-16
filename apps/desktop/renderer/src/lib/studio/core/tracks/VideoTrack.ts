import type { IVideoClip, IVideoTrack } from '@renderer/lib/studio/types';
import { ShapeClip } from '@renderer/lib/studio/core/clips/ShapeClip';
import { Container } from 'pixi.js';
import { VideoClip } from '../clips/VideoClip';
import type { AssetManager } from '@renderer/lib/studio/core/AssetManager';

export class VideoTrack implements IVideoTrack {
  type: 'video' = 'video';
  id: string;
  name: string;
  locked: boolean;
  clips: (ShapeClip | VideoClip)[];

  private container: Container;
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

    this.clips = this.instantiateClips(data.clips);
    this.clips.forEach((clip) => {
      clip.appendTo(this.container);
    });
  }

  appendTo(parent: Container) {
    parent.addChild(this.container);
  }

  private instantiateClips(clips: IVideoClip[]) {
    return clips.map((props) => {
      if (props.type === 'shape') {
        return new ShapeClip(props);
      } else if (props.type === 'video') {
        return new VideoClip(props, this.assetManager);
      }
      throw new Error(`Unsupported clip type: ${props.type}`);
    });
  }

  show() {
    if (this.container.visible) return;
    this.container.visible = true;
  }

  hide() {
    if (!this.container.visible) return;
    this.container.visible = false;
  }

  update(currentTime: number) {
    let visibleItemCnt = 0;
    this.clips.forEach((clip) => {
      if (currentTime >= clip.startTime && currentTime <= clip.endTime) {
        clip.show();
        clip.update(currentTime);
        visibleItemCnt++;
      } else {
        clip.hide();
      }
    });
    console.log(`[VideoTrack] ${this.id} visible clips: ${visibleItemCnt}`);
  }
}
