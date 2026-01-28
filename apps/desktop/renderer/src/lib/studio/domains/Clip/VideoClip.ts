import { Texture, VideoSource } from 'pixi.js';
import type { IVideoClip } from './types';
import { SpriteClip } from './SpriteClip';
import { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import type { SeekingRenderMode, TickContext } from '@/lib/studio/engine/types';
import { toFilePath } from '@/lib/studio/utils/toFilePath';
import type { IVideoAsset } from '../Asset/types';

export class VideoClip extends SpriteClip {
  readonly type = 'video';

  declare protected _data: IVideoClip;

  // State
  private originEl: HTMLVideoElement | null = null;
  private proxyEl: HTMLVideoElement | undefined;
  private originVideoSource: VideoSource | undefined;
  private proxyVideoSource: VideoSource | undefined;
  private isUsingProxy = false;
  private pendingProxySwap = false;
  private pendingOriginSwap = false;

  private _wasVisible = false;

  constructor(renderer: GraphicRenderer, data: IVideoClip) {
    super(renderer, data);
    this._data = data;
    this.debugCall('(Video) constructor');
  }

  async init(): Promise<void> {
    this.debugCall('(Video) init start');
    const asset = this.renderer
      .getDoc()
      .assets.find((a) => a.id === this._data.assetId) as
      | IVideoAsset
      | undefined;

    if (!asset || asset.type !== 'video') {
      throw new Error(
        `[VideoClip] Asset not found or invalid: ${this._data.assetId}`
      );
    }

    this.originEl = await this.createVideoElement(asset);
    this.originEl.pause();
    this.originEl.currentTime = 0;

    try {
      this.proxyEl = await this.createProxyVideoElement(asset);
      if (this.proxyEl) {
        this.proxyEl.pause();
        this.proxyEl.currentTime = 0;
      }
    } catch (error) {
      console.warn(`[VideoClip] Proxy init failed for ${this.id}`, error);
    }

    this.originVideoSource = new VideoSource({
      resource: this.originEl,
      autoPlay: false,
    });
    this.sprite.texture = Texture.from(this.originVideoSource);

    if (this.proxyEl) {
      this.proxyVideoSource = new VideoSource({
        resource: this.proxyEl,
        autoPlay: false,
      });
    }

    this.applyTransform(this._data.transforms);
    this.applyDataChange();
    this.debugCall('(Video) init complete');
  }

  destroy(): void {
    this.debugCall('(Video) destroy');
    if (this.originEl) {
      this.cleanupVideoElement(this.originEl);
    }
    if (this.proxyEl) {
      this.cleanupVideoElement(this.proxyEl);
    }
    super.destroy();
  }

  override onBecameVisible(_ctx: TickContext): void {
    super.onBecameVisible(_ctx);
    this._wasVisible = true;
  }

  override onBecameHidden(_ctx: TickContext): void {
    super.onBecameHidden(_ctx);
    this._wasVisible = false;
    this.cancelPendingSwaps('all');
  }

  override onTick(ctx: TickContext): void {
    super.onTick(ctx);
    const { currentTime, isPlaying, playStateChanged, isSeeking } = ctx;

    const relTime = this.calcRelTime(currentTime);

    if (isPlaying) {
      this.cancelPendingSwaps('proxy');

      if (this.isUsingProxy && this.proxyEl && !this.pendingOriginSwap) {
        this.debugCall('swapping proxy -> origin (during playback)');
        this.requestSwapToOrigin({ resumePlayback: true });
      }

      if (
        this.originEl!.paused &&
        !this.pendingOriginSwap &&
        !this.isUsingProxy
      ) {
        this.debugCall(
          `starting playback at ${relTime.toFixed(2)}s (became: ${this._wasVisible})`
        );
        this.originEl!.currentTime = relTime;
        this.startVideoPlayback();
      }
      return;
    }

    if (playStateChanged) {
      this.debugCall('paused (playStateChanged)');
      this.originEl!.pause();
      this.proxyEl?.pause();
      this.requestSwapToProxyWithDirty();
    }

    if (isSeeking) {
      this.handleSeeking(relTime);
    }
  }

  private handleSeeking(clipRelativeTime: number): void {
    const mode = this.decideSeekingMode();

    if (mode === 'proxy') {
      if (this.isUsingProxy) {
        this.seekWithDirty(this.proxyEl!, clipRelativeTime);
      } else {
        // proxy 를 아직 사용하지 않으면 origin 으로 일단 맞추고 proxy 스왑 요청
        this.seekWithDirty(this.originEl!, clipRelativeTime);
        this.requestSwapToProxyWithDirty();
      }
    } else {
      // === origin 모드 ===
      this.cancelPendingSwaps('proxy');
      // origin 을 사용 중이지 않으면 스왑 요청 & seek
      if (this.isUsingProxy && !this.pendingOriginSwap) {
        this.requestSwapToOrigin({ targetTime: clipRelativeTime });
      } else {
        // origin 을 사용 중이면 바로 seek
        this.seekWithDirty(this.originEl!, clipRelativeTime);
      }
    }
  }

  private decideSeekingMode(): SeekingRenderMode {
    const canUseProxy = !!this.proxyEl;
    return canUseProxy && this.renderer.seekingRenderMode === 'proxy'
      ? 'proxy'
      : 'origin';
  }

  private requestSwapToOrigin(
    options: {
      targetTime?: number;
      resumePlayback?: boolean;
    } = {}
  ): void {
    const { targetTime, resumePlayback = false } = options;
    this.pendingOriginSwap = true;
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(this, sessionId);

    const onSeeked = () => {
      this.originEl!.removeEventListener('seeked', onSeeked);

      if (!this.pendingOriginSwap) return;

      if (this.isUsingProxy) {
        this.swapVideoTexture(this.originEl!);
        this.isUsingProxy = false;
      }
      this.pendingOriginSwap = false;
      this.proxyEl!.pause();
      this.proxyEl!.currentTime = this.originEl!.currentTime;
      if (resumePlayback && this.renderer.timer.isPlaying) {
        this.startVideoPlayback();
      }
      this.renderer.clearClipDirty(this, sessionId);
    };
    this.originEl!.addEventListener('seeked', onSeeked, { once: true });
    this.originEl!.currentTime = targetTime ?? this.proxyEl!.currentTime;
  }

  private requestSwapToProxyWithDirty(): void {
    if (!this.proxyEl || this.isUsingProxy || this.pendingProxySwap) return;
    this.debugCall('(video) requestSwapToProxyWithDirty');
    this.pendingProxySwap = true;
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(this, sessionId);

    const onSeeked = () => {
      this.proxyEl!.removeEventListener('seeked', onSeeked);
      if (!this.renderer.timer.isPlaying && this.pendingProxySwap) {
        this.swapVideoTexture(this.proxyEl!);
        this.isUsingProxy = true;
      }
      this.pendingProxySwap = false;
      this.renderer.clearClipDirty(this, sessionId);
    };
    this.proxyEl!.addEventListener('seeked', onSeeked, { once: true });
    this.proxyEl!.currentTime = this.originEl!.currentTime;
  }

  // origin/proxy 로 texture 스왑 처리
  private swapVideoTexture(targetEl: HTMLVideoElement): void {
    const isSwappingToOrigin = targetEl === this.originEl;
    this.debugCall(
      `swapVideoTexture -> ${isSwappingToOrigin ? 'origin' : 'proxy'}`
    );

    const oldTexture = this.sprite.texture;
    // texture 를 제거하되, VideoSource 는 유지
    if (oldTexture) {
      oldTexture.destroy(false);
    }
    const videoSource = isSwappingToOrigin
      ? this.originVideoSource
      : this.proxyVideoSource;

    // 만들어져있는 videoSource 를 가지고 texture 생성 및 교체
    this.sprite.texture = Texture.from(videoSource!);
    // 일시정지 상태라면 비디오도 일시정지
    if (!this.renderer.timer.isPlaying) {
      targetEl.pause();
    }
  }

  // currentTime 업데이트 및 dirty 처리
  private seekWithDirty(video: HTMLVideoElement, targetTime: number): void {
    const EPSILON = 0.001;
    const isTimeClose = Math.abs(video.currentTime - targetTime) < EPSILON;

    // 미미한 시간 차이는 무시
    if (isTimeClose) return;

    this.debugCall(
      `seekWithDirty from ${video.currentTime.toFixed(2)}s to ${targetTime.toFixed(2)}s`
    );
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(this, sessionId);

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      this.renderer.clearClipDirty(this, sessionId);
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = targetTime;
  }

  private startVideoPlayback(): void {
    this.originEl!.play().catch((e) => {
      console.warn(`[VideoClip] Video play failed: ${this._data.id}`, e);
      this.debugCall(`play() error: ${e.message}`);
    });
  }

  private cancelPendingSwaps(type: 'proxy' | 'origin' | 'all'): void {
    // this.debugCall(`cancelPendingSwaps (${type})`);
    if (type === 'proxy' || type === 'all') this.pendingProxySwap = false;
    if (type === 'origin' || type === 'all') this.pendingOriginSwap = false;
  }

  private calcRelTime(globalTime: number): number {
    const trimStart = this._data.trimStart ?? 0;
    return Math.max(0, (globalTime - this._data.startTime + trimStart) / 1000);
  }

  private async createVideoElement(
    asset: IVideoAsset
  ): Promise<HTMLVideoElement> {
    const video = document.createElement('video');
    video.src = toFilePath(asset.filePath);
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.volume = 1.0;
    video.playbackRate = 1.0;

    await new Promise<void>((resolve, reject) => {
      video.oncanplay = () => resolve();
      video.onerror = () => {
        reject(new Error(`Failed to load video: ${asset.filePath}`));
      };
    });
    return video;
  }

  private async createProxyVideoElement(
    asset: IVideoAsset
  ): Promise<HTMLVideoElement | undefined> {
    if (!asset.proxyFilePath) return undefined;
    const proxy = document.createElement('video');
    proxy.src = toFilePath(asset.proxyFilePath);
    proxy.crossOrigin = 'anonymous';
    proxy.preload = 'auto';
    proxy.volume = 1.0;
    proxy.playbackRate = 1.0;

    await new Promise<void>((resolve) => {
      proxy.oncanplay = () => resolve();
      proxy.onerror = () => {
        resolve();
      };
    });
    return proxy;
  }

  private cleanupVideoElement(video: HTMLVideoElement): void {
    video.pause();
    video.oncanplay = null;
    video.onerror = null;
    video.src = '';
    video.removeAttribute('src');
    video.load();
  }
}
