import { Texture, VideoSource } from 'pixi.js';
import type { IVideoClip } from './types';
import { GraphicClip } from './GraphicClip';
import { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import type { SeekingRenderMode, TickContext } from '@/lib/studio/engine/types';
import { toFilePath } from '@/lib/studio/utils/toFilePath';
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
  private pendingProxySwap = false;
  private pendingOriginSwap = false;
  private wasVisible = false;

  constructor(renderer: GraphicRenderer, data: IVideoClip) {
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
    this.applyEffects();

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
    this.applyEffects();

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
    const origin = this.element!;
    const proxy = this.proxyElement ?? null;

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
      // 일시 정지를 유지하며, 시간 동기화
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
      this.requestSwapToOriginWhilePlaying(clip, origin, proxy);
    }

    const shouldStartPlayback = playStateChanged || clipBecameVisible;

    if (shouldStartPlayback && !this.pendingOriginSwap && !this.isUsingProxy) {
      origin.currentTime = clipRelativeTime;
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
    // 재생 -> 일시정지 전환 시 origin 시간을 proxy 에 동기화 후 모두 일시정지
    if (playStateChanged) {
      this.syncOnPause(clip, origin, proxy);
    }

    // seeking 중이라면 currentTime 및 seek 완료 이벤트 처리
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
    // seeking 은 proxy 로도가능하고, origin 으로도 가능
    const mode: SeekingRenderMode =
      proxy && this.renderer.seekingRenderMode === 'proxy' ? 'proxy' : 'origin';

    // === proxy 모드인 경우 ===
    if (mode === 'proxy') {
      // proxy 가 사용가능하면
      if (this.isUsingProxy && proxy) {
        this.updateVideoCurrentTimeIfNeeded(proxy, clipRelativeTime);
      } else {
        // proxy 가 없다면 origin 으로 처리 (fallback)
        this.updateVideoCurrentTimeIfNeeded(origin, clipRelativeTime);
      }

      // proxy 로 전환이 필요하다면, 전환 요청 (1회)
      if (proxy && !this.isUsingProxy && !this.pendingProxySwap) {
        this.requestSwapToProxy(clip, origin, proxy);
      }
      return;
    }

    // === origin 모드인 경우 === (프레임별로 최종 추출할떄 사용)
    this.cancelPendingSwaps('proxy'); // proxy 스왑 요청 취소

    // proxy 를 사용중이라면 origin 으로 스왑 요청
    if (proxy && this.isUsingProxy && !this.pendingOriginSwap) {
      this.requestSwapToOriginAtTime(clip, origin, proxy, clipRelativeTime);
      return;
    }

    // texture 를 origin 으로 사용중인 경우, 시간 동기화만 처리
    this.updateVideoCurrentTimeIfNeeded(origin, clipRelativeTime);
  }

  // proxy -> origin 으로 스왑이 필요할 떄 호출
  private requestSwapToOriginWhilePlaying(
    clip: IVideoClip,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement
  ): void {
    this.pendingOriginSwap = true;
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(this, sessionId);

    const onSeeked = () => {
      origin.removeEventListener('seeked', onSeeked);

      if (this.pendingOriginSwap && this.isUsingProxy) {
        // texture 스왑
        this.swapVideoTexture(origin);
        this.isUsingProxy = false;
        proxy.pause();

        // 타이머가 재생중이라면, 재생 처리
        if (this.renderer.timer.isPlaying) {
          this.startVideoPlayback(clip, origin);
        }
      }
      this.pendingOriginSwap = false;
      this.renderer.clearClipDirty(this, sessionId);
    };
    origin.addEventListener('seeked', onSeeked, { once: true });
    origin.currentTime = proxy.currentTime;
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

    origin.currentTime = targetTime;
  }

  // proxy 로 스왑 요청 + dirty 처리 + 시간동기화
  private requestSwapToProxy(
    _clip: IVideoClip,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement
  ): void {
    this.pendingProxySwap = true; // 스왑 요청 플래그 ON
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(this, sessionId);

    const onSeeked = () => {
      proxy.removeEventListener('seeked', onSeeked);
      if (!this.renderer.timer.isPlaying && this.pendingProxySwap) {
        // 중복 스왑되지 않게, pending 플래그 확인
        this.swapVideoTexture(proxy); // texture 스왑
        this.isUsingProxy = true; // proxy 사용중으로 상태 변경
      }
      this.pendingProxySwap = false; // 스왑 요청 플래그 해제
      this.renderer.clearClipDirty(this, sessionId); // dirty 해제
    };
    proxy.addEventListener('seeked', onSeeked, { once: true });
    proxy.currentTime = origin.currentTime; // 시간 동기화 및 seek 시작
  }

  // origin/proxy 로 texture 스왑 처리
  private swapVideoTexture(videoElement: HTMLVideoElement): void {
    const oldTexture = this.sprite.texture;
    // texture 를 제거하되, VideoSource 는 유지
    if (oldTexture) {
      oldTexture.destroy(false);
    }
    const isSwappingToOrigin = videoElement === this.element;
    const videoSource = isSwappingToOrigin
      ? this.videoSource
      : this.proxyVideoSource;

    // 만들어져있는 videoSource 를 가지고 texture 생성 및 교체
    this.sprite.texture = Texture.from(videoSource!);
    // 일시정지 상태라면 비디오도 일시정지
    if (!this.renderer.timer.isPlaying) {
      videoElement.pause();
    }
  }

  // currentTime 업데이트 및 dirty 처리
  private updateVideoCurrentTimeIfNeeded(
    video: HTMLVideoElement,
    targetTime: number
  ): void {
    const EPSILON = 0.001;
    const isTimeClose = Math.abs(video.currentTime - targetTime) < EPSILON;

    // 미미한 시간 차이는 무시
    if (isTimeClose) return;

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

  // 일시정지 시, proxy 시간을 origin 시간으로 동기화
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
