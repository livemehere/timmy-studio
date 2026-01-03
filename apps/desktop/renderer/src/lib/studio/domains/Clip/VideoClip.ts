import { Texture, VideoSource } from 'pixi.js';
import type { IVideoClip } from './types';
import { GraphicClip } from './Clip';
import { Renderer } from '@renderer/lib/studio/engine/Renderer';
import type {
  SeekingRenderMode,
  TickContext,
} from '@renderer/lib/studio/engine/types';
import { toFilePath } from '@renderer/lib/studio/utils/toFilePath';
import type { IVideoAsset } from '../Asset/types';

export class VideoClip extends GraphicClip {
  readonly type = 'video';
  public data: IVideoClip;

  // State
  private element: HTMLVideoElement | null = null;
  private proxyElement: HTMLVideoElement | undefined;
  private videoSource: VideoSource | undefined;
  private proxyVideoSource: VideoSource | undefined;
  private isUsingProxy = false;
  private lastSeekTime = -1;
  private lastSeekTarget: 'origin' | 'proxy' | null = null;
  private pendingProxySwap = false;
  private pendingOriginSwap = false;
  private wasVisible = false;

  constructor(renderer: Renderer, data: IVideoClip) {
    super(renderer, data);
    this.data = data;
  }

  async init(): Promise<void> {
    const asset = this.renderer
      .getDoc()
      .assets.find((a) => a.id === this.data.assetId) as
      | IVideoAsset
      | undefined;

    if (!asset || asset.type !== 'video') {
      console.warn(`[VideoClip] Asset not found ${this.data.assetId}`);
      return;
    }

    try {
      this.element = await this.createVideoElement(asset);
      this.element.pause();
      this.element.currentTime = 0;

      this.proxyElement = await this.createProxyVideoElement(asset);
      if (this.proxyElement) {
        this.proxyElement.pause();
        this.proxyElement.currentTime = 0;
      }

      this.videoSource = new VideoSource({
        resource: this.element,
        autoPlay: false,
      });
      this.sprite.texture = Texture.from(this.videoSource);

      if (this.proxyElement) {
        this.proxyVideoSource = new VideoSource({
          resource: this.proxyElement,
          autoPlay: false,
        });
      }

      this.applyTransform(this.data.transforms);

      console.log(`[VideoClip] VideoClip(${this.id}) initialized`);
    } catch (error) {
      console.error(`[VideoClip] Failed to init clip ${this.id}`, error);
    }
  }

  // 수동 업데이트
  update(data: IVideoClip): void {
    this.data = data;

    const curTimeMs = this.renderer.timer.currentMs;
    const isVisible = this.shouldRender(curTimeMs);

    this.sprite.visible = isVisible;

    if (!isVisible) {
      this.pauseVideoClip();
      return;
    }

    this.applyTransform(data.transforms);

    // Sync time
    const origin = this.element;
    const proxy = this.proxyElement ?? null;
    const clipRelativeTime = this.calcClipRelativeTime(data, curTimeMs);

    if (origin) {
      origin.currentTime = clipRelativeTime;
      if (proxy) {
        proxy.currentTime = clipRelativeTime;
      }
    }
  }

  destroy(): void {
    this.sprite.destroy(true);

    if (this.element) {
      this.cleanupVideoElement(this.element);
    }
    if (this.proxyElement) {
      this.cleanupVideoElement(this.proxyElement);
    }

    console.log(`[VideoClip] Clip(${this.id}) destroyed`);
  }

  tick(ctx: TickContext): void {
    const { currentTime, isPlaying, playStateChanged, isSeeking } = ctx;

    // 렌더링 해야되지 않으면, 비디오를 정지하고, 스프라이트를 숨김
    if (!this.shouldRender(currentTime)) {
      this.pauseVideoClip();
      this.wasVisible = false;
      this.sprite.visible = false;
      return;
    }

    // 매 틱 마다 호출되는 함수이기 때문에, visible 상태가 false 일때만 true 로 처리
    if (!this.sprite.visible) {
      this.sprite.visible = true;
    }

    // 전 tick 에서 보이지 않았었다면, 이번 프레임이 보이게 된 시점
    const clipBecameVisible = !this.wasVisible;

    this.applyTransform(this.data.transforms);

    this.handleVideoClip(
      this.data,
      currentTime,
      isPlaying,
      playStateChanged,
      isSeeking,
      clipBecameVisible
    );

    this.wasVisible = true;
  }

  private handleVideoClip(
    clip: IVideoClip,
    currentTime: number,
    isPlaying: boolean,
    playStateChanged: boolean,
    isSeeking: boolean,
    clipBecameVisible: boolean
  ): void {
    const origin = this.element;
    const proxy = this.proxyElement ?? null;
    if (!origin) return;

    const clipRelativeTime = this.calcClipRelativeTime(clip, currentTime);

    if (isPlaying) {
      // 비디오가 재생중이지 않다면, 재생하도록 만들어야한다.
      this.handleVideoPlaying(
        clip,
        origin,
        proxy,
        clipRelativeTime,
        playStateChanged,
        clipBecameVisible
      );
    } else {
      this.handleVideoPaused(
        clip,
        origin,
        proxy,
        clipRelativeTime,
        playStateChanged,
        isSeeking
      );
    }
  }

  private handleVideoPlaying(
    clip: IVideoClip,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement | null,
    clipRelativeTime: number,
    playStateChanged: boolean,
    clipBecameVisible: boolean
  ): void {
    // proxy 로 스왑중이라면 취소
    this.cancelPendingSwaps('proxy');

    // proxy 를 이미 사용중이라면, origin 으로 스왑 요청
    if (this.isUsingProxy && proxy && !this.pendingOriginSwap) {
      this.requestSwapToOrigin(clip, origin, proxy);
    }

    const shouldStartPlayback = playStateChanged || clipBecameVisible;

    if (shouldStartPlayback && !this.pendingOriginSwap && !this.isUsingProxy) {
      if (clipBecameVisible) {
        origin.currentTime = clipRelativeTime;
      }
      this.startVideoPlayback(clip, origin);
    }
  }

  private handleVideoPaused(
    clip: IVideoClip,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement | null,
    clipRelativeTime: number,
    playStateChanged: boolean,
    isSeeking: boolean
  ): void {
    if (playStateChanged) {
      this.syncOnPause(clip, origin, proxy);
    }

    if (isSeeking) {
      this.handleSeeking(clip, origin, proxy, clipRelativeTime);
    }
  }

  private handleSeeking(
    clip: IVideoClip,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement | null,
    clipRelativeTime: number
  ): void {
    const mode: SeekingRenderMode =
      proxy && this.renderer.seekingRenderMode === 'proxy' ? 'proxy' : 'origin';

    if (mode === 'proxy') {
      if (this.isUsingProxy && proxy) {
        this.updateVideoCurrentTimeIfNeeded(proxy, clipRelativeTime, 'proxy');
      } else {
        this.updateVideoCurrentTimeIfNeeded(origin, clipRelativeTime, 'origin');
      }

      if (proxy && !this.isUsingProxy && !this.pendingProxySwap) {
        this.requestSwapToProxy(clip, origin, proxy);
      }
      return;
    }

    this.cancelPendingSwaps('proxy');

    if (proxy && this.isUsingProxy && !this.pendingOriginSwap) {
      this.requestSwapToOriginAtTime(clip, origin, proxy, clipRelativeTime);
      return;
    }

    this.updateVideoCurrentTimeIfNeeded(origin, clipRelativeTime, 'origin');
  }

  private requestSwapToOrigin(
    clip: IVideoClip,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement
  ): void {
    this.pendingOriginSwap = true;
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(this, sessionId);

    origin.currentTime = proxy.currentTime;

    const onSeeked = () => {
      origin.removeEventListener('seeked', onSeeked);

      if (this.pendingOriginSwap && this.isUsingProxy) {
        this.swapVideoTexture(origin);
        this.isUsingProxy = false;
        this.pendingOriginSwap = false;
        proxy.pause();

        this.renderer.clearClipDirty(this, sessionId);
        if (this.renderer.timer.isPlaying) {
          this.startVideoPlayback(clip, origin);
        }
      } else {
        this.pendingOriginSwap = false;
        this.renderer.clearClipDirty(this, sessionId);
      }
    };
    origin.addEventListener('seeked', onSeeked, { once: true });
  }

  private requestSwapToOriginAtTime(
    _clip: IVideoClip,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement,
    targetTime: number
  ): void {
    this.pendingOriginSwap = true;
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(this, sessionId);
    origin.currentTime = targetTime;

    const onSeeked = () => {
      origin.removeEventListener('seeked', onSeeked);

      if (!this.pendingOriginSwap) return;

      if (this.isUsingProxy) {
        this.swapVideoTexture(origin);
        this.isUsingProxy = false;
      }
      this.pendingOriginSwap = false;
      proxy.pause();
      proxy.currentTime = origin.currentTime;
      this.renderer.clearClipDirty(this, sessionId);
    };
    origin.addEventListener('seeked', onSeeked, { once: true });
  }

  private requestSwapToProxy(
    _clip: IVideoClip,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement
  ): void {
    this.pendingProxySwap = true;
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(this, sessionId);
    proxy.currentTime = origin.currentTime;

    const onSeeked = () => {
      proxy.removeEventListener('seeked', onSeeked);
      if (!this.renderer.timer.isPlaying && this.pendingProxySwap) {
        this.swapVideoTexture(proxy);
        this.isUsingProxy = true;
        this.pendingProxySwap = false;
        this.renderer.clearClipDirty(this, sessionId);
      } else {
        this.pendingProxySwap = false;
        this.renderer.clearClipDirty(this, sessionId);
      }
    };
    proxy.addEventListener('seeked', onSeeked, { once: true });
  }

  private swapVideoTexture(videoElement: HTMLVideoElement): void {
    const oldTexture = this.sprite.texture;
    if (oldTexture) {
      oldTexture.destroy(false);
    }
    const isSwappingToOrigin = videoElement === this.element;
    const videoSource = isSwappingToOrigin
      ? this.videoSource
      : this.proxyVideoSource;

    if (!videoSource) return;

    this.sprite.texture = Texture.from(videoSource);
    if (!this.renderer.timer.isPlaying) {
      videoElement.pause();
    }
  }

  private updateVideoCurrentTimeIfNeeded(
    video: HTMLVideoElement,
    targetTime: number,
    target: 'origin' | 'proxy'
  ): void {
    const EPSILON = 0.001;
    if (Math.abs(video.currentTime - targetTime) < EPSILON) return;

    if (
      this.lastSeekTarget === target &&
      Math.abs(this.lastSeekTime - targetTime) < EPSILON
    ) {
      return;
    }

    this.lastSeekTime = targetTime;
    this.lastSeekTarget = target;
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(this, sessionId);

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      this.renderer.clearClipDirty(this, sessionId);
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = targetTime;
  }

  private startVideoPlayback(clip: IVideoClip, origin: HTMLVideoElement): void {
    origin.play().catch((e) => {
      console.warn(`[VideoClip] Video play failed: ${clip.id}`, e);
    });
  }

  private syncOnPause(
    _clip: IVideoClip,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement | null
  ): void {
    const actualOriginTime = origin.currentTime;
    origin.pause();
    if (proxy) {
      proxy.currentTime = actualOriginTime;
      proxy.pause();
    }
  }

  private pauseVideoClip(): void {
    const origin = this.element;
    const proxy = this.proxyElement ?? null;
    if (origin && !origin.paused) origin.pause();
    if (proxy && !proxy.paused) proxy.pause();
  }

  private cancelPendingSwaps(type: 'proxy' | 'origin' | 'all' = 'all'): void {
    if (type === 'proxy' || type === 'all') this.pendingProxySwap = false;
    if (type === 'origin' || type === 'all') this.pendingOriginSwap = false;
  }

  private calcClipRelativeTime(clip: IVideoClip, currentTime: number): number {
    const trimStart = clip.trimStart ?? 0;
    return (currentTime - clip.startTime + trimStart) / 1000;
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
