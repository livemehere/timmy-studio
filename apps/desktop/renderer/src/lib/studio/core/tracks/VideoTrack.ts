import type { IVideoClip, IVideoTrack } from '@renderer/lib/studio/types';
import { ShapeClip } from '@renderer/lib/studio/core/clips/ShapeClip';
import { TextClip } from '@renderer/lib/studio/core/clips/TextClip';
import { Container } from 'pixi.js';

type VideoClip = ShapeClip | TextClip;

export class VideoTrack implements IVideoTrack {
  type: 'video' = 'video';
  id: string;
  name: string;
  locked: boolean;
  clips: VideoClip[];

  private container: Container = new Container();

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

  constructor(props: IVideoTrack) {
    this.id = props.id;
    this.locked = props.locked;
    this.name = props.name;

    this.enabled = props.enabled;
    this.opacity = props.opacity;
    this.zIndex = props.zIndex;

    this.clips = this.instantiateClips(props.clips);
    this.clips.forEach((clip) => {
      clip.add(this.container);
    });
  }

  add(parent: Container) {
    parent.addChild(this.container);
  }

  private instantiateClips(clips: IVideoClip[]) {
    return clips.map((props) => {
      if (props.type === 'shape') {
        return new ShapeClip(props);
      }
      if (props.type === 'text') {
        return new TextClip(props);
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
