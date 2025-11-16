import type { IVideoClip, IVideoTrack } from '@renderer/lib/studio/types';
import type { PlaybackContext } from '@renderer/lib/studio/core/Timer';
import { ShapeClip } from '@renderer/lib/studio/core/clips/ShapeClip';
import { TextClip } from '@renderer/lib/studio/core/clips/TextClip';
import { ImageClip } from '@renderer/lib/studio/core/clips/ImageClip';
import { VideoMediaClip } from '@renderer/lib/studio/core/clips/VideoMediaClip';
import { Container } from 'pixi.js';

type VideoClip = ShapeClip | TextClip | ImageClip | VideoMediaClip;

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
      if (props.type === 'image') {
        return new ImageClip(props);
      }
      if (props.type === 'video') {
        return new VideoMediaClip(props);
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

  update(context: PlaybackContext) {
    this.clips.forEach((clip) => {
      if (context.currentTime >= clip.startTime && context.currentTime <= clip.endTime) {
        clip.show();
        clip.update(context);
      } else {
        clip.hide();
      }
    });
  }
}
