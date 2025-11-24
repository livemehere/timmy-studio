import type { IVideoAsset, IVideoMediaClip } from '../../types';
import { Sprite, Texture, TextureSource } from 'pixi.js';
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

  private originVideoTexture?: Texture<TextureSource<HTMLVideoElement>>;
  private proxyVideoTexture?: Texture<TextureSource<HTMLVideoElement>>;
  private currentType: 'origin' | 'proxy' = 'origin';

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

    const asset = this.assetManager.getAssetById<IVideoAsset>(this.assetId);
    if (!asset) {
      throw new Error(`Video(${this.id})'s asset(${this.assetId}) not found`);
    }

    this.loadVideo(asset.filePath)
      .then(({ videoEl, texture }) => {
        const size = this.transforms.size;
        if (size) {
          this.sprite.width = size.width;
          this.sprite.height = size.height;
        }

        this.originVideoEl = videoEl;
        this.originVideoTexture = texture;
        this.container.addChild(this.sprite);
        this.sprite.texture = texture;
        this.removePlaceholder();
      })
      .catch((err) => {
        console.error(err);
      });

    if (asset.proxyFilePath) {
      this.loadVideo(asset.proxyFilePath)
        .then(({ videoEl, texture }) => {
          this.proxyVideoEl = videoEl;
          this.proxyVideoTexture = texture;
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }

  private loadVideo(filePath: string) {
    return new Promise<{
      videoEl: HTMLVideoElement;
      texture: Texture<TextureSource<HTMLVideoElement>>;
    }>((resolve, reject) => {
      const videoEl = document.createElement('video');
      videoEl.src = filePath;
      videoEl.crossOrigin = 'anonymous';
      videoEl.muted = false;
      videoEl.loop = false;
      videoEl.preload = 'auto';
      videoEl.autoplay = false;
      videoEl.oncanplay = () => {
        const texture = Texture.from(videoEl);
        resolve({
          videoEl,
          texture,
        });
      };
      videoEl.onerror = (e) => {
        reject(e);
      };
    });
  }

  private pauseVideos() {
    if (this.originVideoEl && !this.originVideoEl.paused) {
      this.originVideoEl.pause();
    }

    if (this.proxyVideoEl && !this.proxyVideoEl.paused) {
      this.proxyVideoEl.pause();
    }
  }

  private swapVideoTexture(type: 'origin' | 'proxy') {
    if (this.currentType === type)
      return type === 'proxy' ? this.proxyVideoEl : this.originVideoEl;

    this.currentType = type;
    if (this.proxyVideoTexture) {
      this.sprite.texture = this.proxyVideoTexture;
      return this.proxyVideoEl;
    }

    if (this.originVideoTexture) {
      this.sprite.texture = this.originVideoTexture;
    }
    return this.originVideoEl;
  }

  private seek(videoEl: HTMLVideoElement, timeSec: number) {
    if (videoEl.currentTime === timeSec) return;
    videoEl.currentTime = timeSec;
  }

  private getDurationSec() {
    if (this.trimStart !== undefined && this.trimEnd !== undefined) {
      return (this.trimEnd - this.trimStart) / 1000;
    }
    if (this.originVideoEl) {
      return this.originVideoEl.duration;
    }
    return 0;
  }

  update(timer: Timer) {
    this.applyTransforms(); // TODO: 변화가 있을떄만 update 직접 하도록 rxjs 로 전환

    const curSec = Math.max(
      0,
      Math.min(msToSec(timer.currentMs, 3), this.getDurationSec())
    );

    if (timer.isPlaying) {
      if (this.originVideoEl?.paused && curSec < this.getDurationSec()) {
        this.swapVideoTexture('origin');
        this.originVideoEl.currentTime = curSec;
        this.originVideoEl.play();
        console.log(
          `[VideoClip] ${this.name} play at`,
          this.originVideoEl.currentTime
        );
      }
      return;
    }

    this.pauseVideos();
    this.seek(this.proxyVideoEl ?? this.originVideoEl!, curSec);
    this.swapVideoTexture('proxy');
  }
}
