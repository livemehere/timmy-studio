import type { ITransform, IVideoAsset, IVideoMediaClip } from '../../types';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { AssetManager } from '@renderer/lib/studio/core/AssetManager';
import type { Timer } from '@renderer/lib/studio/core/Timer';
import { msToSec } from '@renderer/lib/studio/utils/time';

export class VideoClip implements IVideoMediaClip {
  type: 'video' = 'video';
  id: string;
  name: string;

  startTime: number;
  endTime: number;

  assetId: string;
  trimStart?: number;
  trimEnd?: number;

  transforms: ITransform;

  private readonly assetManager: AssetManager;
  private readonly container: Container;

  private placeholder?: Graphics;
  private originVideoEl?: HTMLVideoElement;
  private proxyVideoEl?: HTMLVideoElement;

  static getLabel(id: string) {
    return `VideoClip-${id}`;
  }

  constructor(props: IVideoMediaClip, assetManager: AssetManager) {
    this.assetManager = assetManager;

    this.id = props.id;
    this.name = props.name;

    this.startTime = props.startTime;
    this.endTime = props.endTime;

    this.assetId = props.assetId;
    this.trimStart = props.trimStart;
    this.trimEnd = props.trimEnd;

    this.transforms = props.transforms;

    this.container = new Container();
    this.container.label = VideoClip.getLabel(this.id);
    this.applyTransforms();
    this.createPlaceholder();
    this.loadAsset();

    const asset = this.assetManager.getAssetById<IVideoAsset>(this.assetId);
    console.log(asset?.filePath, asset?.proxyFilePath);
  }

  private createPlaceholder() {
    this.placeholder = new Graphics()
      .rect(0, 0, 1280, 720)
      .fill(0x333333)
      .stroke(0x666666);
    this.container.addChild(this.placeholder);
  }

  private async loadAsset() {
    const asset = this.assetManager.getAssetById<IVideoAsset>(this.assetId);
    if (!asset) {
      throw new Error('Video asset not found: ' + this.assetId);
    }

    const videoEl = document.createElement('video');
    videoEl.src = asset.filePath;
    videoEl.crossOrigin = 'anonymous';
    videoEl.muted = false;
    videoEl.loop = false;
    videoEl.preload = 'auto';
    videoEl.autoplay = false;

    videoEl.oncanplay = () => {
      const texture = Texture.from(videoEl);
      const sprite = new Sprite(texture);
      this.container.addChild(sprite);

      if (this.placeholder) {
        this.container.removeChild(this.placeholder);
        this.placeholder.destroy();
        this.placeholder = undefined;
      }
    };
    this.originVideoEl = videoEl;
  }

  appendTo(parent: Container) {
    parent.addChild(this.container);
  }

  private applyTransforms() {
    const { position, scaleX, scaleY, opacity, rotation, anchorX, anchorY } =
      this.transforms;

    // TODO: 비디오 소스의 width/height로 anchor 계산 필요
    if (anchorX !== undefined && anchorY !== undefined) {
      this.container.pivot.set(anchorX, anchorY);
    }

    this.container.position.set(position.x, position.y);
    this.container.scale.set(scaleX ?? 1, scaleY ?? 1);
    this.container.rotation = rotation ?? 0;
    this.container.alpha = opacity ?? 1;
  }

  tick(timer: Timer) {
    const currentTime = timer.currentMs;
    if (currentTime >= this.startTime && currentTime <= this.endTime) {
      this.show();
      this.update(timer);
    } else {
      this.hide();
    }
  }

  update(timer: Timer) {
    if (timer.isPlaying) {
      if (this.originVideoEl?.paused) {
        this.originVideoEl.currentTime = msToSec(timer.currentMs, 2);
        this.originVideoEl.play();
        console.log(
          `[VideoClip] ${this.name} play at`,
          this.originVideoEl.currentTime
        );
      }
    } else {
      if (!this.originVideoEl?.paused) {
        this.originVideoEl?.pause();
      }
      const seekTime = msToSec(timer.currentMs, 2);
      if (seekTime !== this.originVideoEl?.currentTime) {
        this.originVideoEl!.currentTime = seekTime;
        console.log(`[VideoClip] ${this.name} seek to`, seekTime);
      }
    }
    this.applyTransforms();
  }

  private show() {
    if (this.container.visible) return;
    this.container.visible = true;
  }

  private hide() {
    if (!this.container.visible) return;
    this.container.visible = false;
  }

  destroy() {
    this.container.destroy(true);
  }
}
