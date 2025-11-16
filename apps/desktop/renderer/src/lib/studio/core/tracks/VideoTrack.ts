import type { IVideoClip, IVideoTrack } from '@renderer/lib/studio/types';
import { ShapeClip } from '@renderer/lib/studio/core/clips/ShapeClip';
import { Container } from 'pixi.js';

type VideoClip = ShapeClip;

export class VideoTrack implements IVideoTrack {
  type: 'video' = 'video';
  id: string;
  name: string;
  locked: boolean;
  clips: VideoClip[];

  private container: Container;

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

  constructor(data: IVideoTrack) {
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
    this.clips.forEach((clip) => {
      if (currentTime >= clip.startTime && currentTime <= clip.endTime) {
        clip.show();
        clip.update(currentTime);
      } else {
        clip.hide();
      }
    });
  }
}
