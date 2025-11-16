import type { IVideoAsset, IVideoMediaClip } from '../../types';
import { Sprite, Texture } from 'pixi.js';
import type { AssetManager } from '@renderer/lib/studio/core/AssetManager';
import type { Timer } from '@renderer/lib/studio/core/Timer';
import { msToSec } from '@renderer/lib/studio/utils/time';
import { BaseVideoClip } from '@renderer/lib/studio/core/clips/BaseVideoClip';

export class VideoClip extends BaseVideoClip implements IVideoMediaClip {
  type: 'video' = 'video';
  assetId: string;
  trimStart?: number;
  trimEnd?: number;

  private readonly assetManager: AssetManager;

  private originVideoEl?: HTMLVideoElement;
  private proxyVideoEl?: HTMLVideoElement;

  private readonly sprite: Sprite;

  protected getLabel(id: string) {
    return `VideoClip-${id}`;
  }

  constructor(props: IVideoMediaClip, assetManager: AssetManager) {
    super(props);
    this.assetManager = assetManager;
    this.assetId = props.assetId;
    this.trimStart = props.trimStart;
    this.trimEnd = props.trimEnd;
    this.showPlaceholder();

    this.sprite = new Sprite();
    this.loadAsset()
      .then(() => {
        this.container.addChild(this.sprite);
        this.removePlaceholder();
      })
      .catch((err) => {
        console.error(err);
      });
  }

  private loadAsset() {
    return new Promise<void>((resolve, reject) => {
      const asset = this.assetManager.getAssetById<IVideoAsset>(this.assetId);
      if (!asset) {
        reject(`Video(${this.id})'s asset(${this.assetId}) not found`);
        return;
      }

      const size = this.transforms.size;

      const videoEl = document.createElement('video');
      videoEl.src = asset.filePath;
      videoEl.crossOrigin = 'anonymous';
      videoEl.muted = false;
      videoEl.loop = false;
      videoEl.preload = 'auto';
      videoEl.autoplay = false;

      videoEl.oncanplay = () => {
        this.originVideoEl = videoEl;

        this.sprite.texture = Texture.from(videoEl);
        if (size) {
          this.sprite.width = size.width;
          this.sprite.height = size.height;
        }
        resolve();
      };
      videoEl.onerror = (e) => {
        reject(e);
      };
    });
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
}
