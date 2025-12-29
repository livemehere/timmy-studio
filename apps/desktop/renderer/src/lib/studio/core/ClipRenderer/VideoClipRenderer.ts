import { Container, Sprite, Texture, VideoSource } from 'pixi.js';
import type { IVideoClip } from '../../domains/Clip/types';
import type { Renderer } from '../Renderer';
import type { TickContext, ClipState, SeekingRenderMode } from '../types';
import { toFilePath } from '../../utils/toFilePath';
import { ClipUtils } from '../../domains/Clip/utils';
import {
  didClipBecomeVisible,
  shouldStartVideoPlayback,
} from '../playbackGuards';
import type { IVideoAsset } from '../../domains/Asset/types';
import { ClipRenderer } from './ClipRenderer';

export class VideoClipRenderer extends ClipRenderer<IVideoClip> {
  readonly type = 'video';

  constructor(renderer: Renderer) {
    super(renderer);
  }

  async add(clip: IVideoClip, container: Container): Promise<void> {
    const asset = this.renderer
      .getDoc()
      .assets.find((a) => a.id === clip.assetId) as IVideoAsset;
    if (!asset || asset.type !== 'video') {
      console.warn(
        `[VideoClipRenderer] Asset not found or invalid: ${clip.assetId}`
      );
      return;
    }

    try {
      const element = await this.createVideoElement(asset);
      element.pause();
      element.currentTime = 0;

      const proxyElement = await this.createProxyVideoElement(asset);
      if (proxyElement) {
        proxyElement.pause();
        proxyElement.currentTime = 0;
      }

      const videoSource = new VideoSource({
        resource: element,
        autoPlay: false,
      });
      const texture = Texture.from(videoSource);
      const sprite = new Sprite(texture);
      sprite.label = `Clip-${clip.id}`;

      let proxyVideoSource: VideoSource | undefined;
      if (proxyElement) {
        proxyVideoSource = new VideoSource({
          resource: proxyElement,
          autoPlay: false,
        });
      }

      this.applyTransform(sprite, clip.transforms);
      container.addChild(sprite);

      this.renderer.clipSprites.set(clip.id, sprite);

      const state: ClipState = {
        clip,
        trackId: container.label?.replace('Track-', '') || '',
        element,
        proxyElement,
        videoSource,
        proxyVideoSource,
        isUsingProxy: false,
        lastSeekTime: -1,
        lastSeekTarget: null,
        dirty: false,
        dirtySessionId: null,
        pendingProxySwap: false,
        pendingOriginSwap: false,
      };
      this.renderer.clipStates.set(clip.id, state);

      console.log(`[VideoClipRenderer] VideoClip(${clip.id}) added`);
    } catch (error) {
      console.error(`[VideoClipRenderer] Failed to add clip ${clip.id}`, error);
    }
  }

  update(clip: IVideoClip): void {
    const state = this.renderer.clipStates.get(clip.id);
    if (!state) return;

    state.clip = clip;
    const sprite = this.renderer.clipSprites.get(clip.id);
    if (!sprite) return;

    const curTimeMs = this.renderer.timer.currentMs;
    const isVisible =
      clip.enabled && ClipUtils.isClipVisibleAtTime(clip, curTimeMs);

    sprite.visible = isVisible;

    if (!isVisible) {
      this.pauseVideoClip(state);
      return;
    }

    this.applyTransform(sprite, clip.transforms);

    // Sync time
    const origin = state.element as HTMLVideoElement;
    const proxy = state.proxyElement ?? null;
    const clipRelativeTime = this.calcClipRelativeTime(clip, curTimeMs);

    if (origin) {
      origin.currentTime = clipRelativeTime;
      if (proxy) {
        proxy.currentTime = clipRelativeTime;
      }
    }
  }

  remove(clipId: string): void {
    const sprite = this.renderer.clipSprites.get(clipId);
    const state = this.renderer.clipStates.get(clipId);

    if (sprite) {
      sprite.parent?.removeChild(sprite);
      sprite.destroy(true);
      this.renderer.clipSprites.delete(clipId);
    }

    if (state) {
      const { element, proxyElement } = state;
      if (element instanceof HTMLVideoElement) {
        this.cleanupVideoElement(element);
      }
      if (proxyElement) {
        this.cleanupVideoElement(proxyElement);
      }
      this.renderer.clipStates.delete(clipId);
    }
    console.log(`[VideoClipRenderer] Clip(${clipId}) removed`);
  }

  tick(ctx: TickContext): void {
    for (const [clipId, state] of this.renderer.clipStates) {
      if (state.clip.type !== 'video') continue;

      const sprite = this.renderer.clipSprites.get(clipId);
      if (!sprite) continue;

      this.updateSingleClipForFrame(state, sprite, ctx);
    }
  }

  private updateSingleClipForFrame(
    state: ClipState,
    sprite: Sprite,
    ctx: TickContext
  ): void {
    const { clip } = state;
    const { currentTime, isPlaying, playStateChanged, isSeeking } = ctx;

    const wasClipVisible = sprite.visible;
    const isClipVisible =
      currentTime >= clip.startTime && currentTime < clip.endTime;

    sprite.visible = isClipVisible;

    const clipBecameVisible = didClipBecomeVisible({
      wasVisible: wasClipVisible,
      isVisible: isClipVisible,
    });

    if (!isClipVisible) {
      if (clip.type === 'video') {
        this.pauseVideoClip(state);
      }
      return;
    }

    this.applyTransform(sprite, clip.transforms);

    this.handleVideoClip(
      clip as IVideoClip,
      sprite,
      state,
      currentTime,
      isPlaying,
      playStateChanged,
      isSeeking,
      clipBecameVisible
    );
  }

  private handleVideoClip(
    clip: IVideoClip,
    sprite: Sprite,
    state: ClipState,
    currentTime: number,
    isPlaying: boolean,
    playStateChanged: boolean,
    isSeeking: boolean,
    clipBecameVisible: boolean
  ): void {
    const origin = state.element as HTMLVideoElement;
    const proxy = state.proxyElement ?? null;
    if (!origin) return;

    const clipRelativeTime = this.calcClipRelativeTime(clip, currentTime);

    if (isPlaying) {
      this.handleVideoPlaying(
        clip,
        sprite,
        state,
        origin,
        proxy,
        clipRelativeTime,
        playStateChanged,
        clipBecameVisible
      );
    } else {
      this.handleVideoPaused(
        clip,
        sprite,
        state,
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
    sprite: Sprite,
    state: ClipState,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement | null,
    clipRelativeTime: number,
    playStateChanged: boolean,
    clipBecameVisible: boolean
  ): void {
    this.cancelPendingSwaps(state, 'proxy');

    if (state.isUsingProxy && proxy && !state.pendingOriginSwap) {
      this.requestSwapToOrigin(clip, sprite, state, origin, proxy);
    }

    const shouldStartPlayback = shouldStartVideoPlayback({
      playStateChanged,
      clipBecameVisible,
    });

    if (
      shouldStartPlayback &&
      !state.pendingOriginSwap &&
      !state.isUsingProxy
    ) {
      if (clipBecameVisible) {
        origin.currentTime = clipRelativeTime;
      }
      this.startVideoPlayback(clip, origin);
    }
  }

  private handleVideoPaused(
    clip: IVideoClip,
    sprite: Sprite,
    state: ClipState,
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
      this.handleSeeking(clip, sprite, state, origin, proxy, clipRelativeTime);
    }

    this.ensureProxyPaused(proxy);
  }

  private handleSeeking(
    clip: IVideoClip,
    sprite: Sprite,
    state: ClipState,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement | null,
    clipRelativeTime: number
  ): void {
    const mode: SeekingRenderMode =
      proxy && this.renderer.seekingRenderMode === 'proxy' ? 'proxy' : 'origin';

    if (mode === 'proxy') {
      if (state.isUsingProxy && proxy) {
        this.updateVideoCurrentTimeIfNeeded(
          state,
          proxy,
          clipRelativeTime,
          'proxy'
        );
      } else {
        this.updateVideoCurrentTimeIfNeeded(
          state,
          origin,
          clipRelativeTime,
          'origin'
        );
      }

      if (proxy && !state.isUsingProxy && !state.pendingProxySwap) {
        this.requestSwapToProxy(clip, sprite, state, origin, proxy);
      }
      return;
    }

    this.cancelPendingSwaps(state, 'proxy');

    if (proxy && state.isUsingProxy && !state.pendingOriginSwap) {
      this.requestSwapToOriginAtTime(
        clip,
        sprite,
        state,
        origin,
        proxy,
        clipRelativeTime
      );
      return;
    }

    this.updateVideoCurrentTimeIfNeeded(
      state,
      origin,
      clipRelativeTime,
      'origin'
    );
  }

  private requestSwapToOrigin(
    clip: IVideoClip,
    sprite: Sprite,
    state: ClipState,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement
  ): void {
    state.pendingOriginSwap = true;
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(state, sessionId);

    origin.currentTime = proxy.currentTime;

    const onSeeked = () => {
      origin.removeEventListener('seeked', onSeeked);

      if (state.pendingOriginSwap && state.isUsingProxy) {
        this.swapVideoTexture(sprite, state, origin, clip.id);
        state.isUsingProxy = false;
        state.pendingOriginSwap = false;
        proxy.pause();

        this.renderer.clearClipDirty(state, sessionId);
        if (this.renderer.timer.isPlaying) {
          this.startVideoPlayback(clip, origin);
        }
      } else {
        state.pendingOriginSwap = false;
        this.renderer.clearClipDirty(state, sessionId);
      }
    };
    origin.addEventListener('seeked', onSeeked, { once: true });
  }

  private requestSwapToOriginAtTime(
    clip: IVideoClip,
    sprite: Sprite,
    state: ClipState,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement,
    targetTime: number
  ): void {
    state.pendingOriginSwap = true;
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(state, sessionId);
    origin.currentTime = targetTime;

    const onSeeked = () => {
      origin.removeEventListener('seeked', onSeeked);

      if (!state.pendingOriginSwap) return;

      if (state.isUsingProxy) {
        this.swapVideoTexture(sprite, state, origin, clip.id);
        state.isUsingProxy = false;
      }
      state.pendingOriginSwap = false;
      proxy.pause();
      proxy.currentTime = origin.currentTime;
      this.renderer.clearClipDirty(state, sessionId);
    };
    origin.addEventListener('seeked', onSeeked, { once: true });
  }

  private requestSwapToProxy(
    clip: IVideoClip,
    sprite: Sprite,
    state: ClipState,
    origin: HTMLVideoElement,
    proxy: HTMLVideoElement
  ): void {
    state.pendingProxySwap = true;
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(state, sessionId);
    proxy.currentTime = origin.currentTime;

    const onSeeked = () => {
      proxy.removeEventListener('seeked', onSeeked);
      if (!this.renderer.timer.isPlaying && state.pendingProxySwap) {
        this.swapVideoTexture(sprite, state, proxy, clip.id);
        state.isUsingProxy = true;
        state.pendingProxySwap = false;
        this.renderer.clearClipDirty(state, sessionId);
      } else {
        state.pendingProxySwap = false;
        this.renderer.clearClipDirty(state, sessionId);
      }
    };
    proxy.addEventListener('seeked', onSeeked, { once: true });
  }

  private swapVideoTexture(
    sprite: Sprite,
    state: ClipState,
    videoElement: HTMLVideoElement,
    _clipId: string
  ): void {
    const oldTexture = sprite.texture;
    if (oldTexture) {
      oldTexture.destroy(false);
    }
    const isSwappingToOrigin = videoElement === state.element;
    const videoSource = isSwappingToOrigin
      ? state.videoSource
      : state.proxyVideoSource;

    if (!videoSource) return;

    sprite.texture = Texture.from(videoSource);
    if (!this.renderer.timer.isPlaying) {
      videoElement.pause();
    }
  }

  private updateVideoCurrentTimeIfNeeded(
    state: ClipState,
    video: HTMLVideoElement,
    targetTime: number,
    target: 'origin' | 'proxy'
  ): void {
    const EPSILON = 0.001;
    if (Math.abs(video.currentTime - targetTime) < EPSILON) return;

    if (
      state.lastSeekTarget === target &&
      Math.abs(state.lastSeekTime - targetTime) < EPSILON
    ) {
      return;
    }

    state.lastSeekTime = targetTime;
    state.lastSeekTarget = target;
    const sessionId = this.renderer.currentSeekSessionId;
    this.renderer.markClipDirty(state, sessionId);

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      this.renderer.clearClipDirty(state, sessionId);
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = targetTime;
  }

  private startVideoPlayback(clip: IVideoClip, origin: HTMLVideoElement): void {
    origin.play().catch((e) => {
      console.warn(`[VideoClipRenderer] Video play failed: ${clip.id}`, e);
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

  private ensureProxyPaused(proxy: HTMLVideoElement | null): void {
    if (proxy && !proxy.paused) {
      proxy.pause();
    }
  }

  private pauseVideoClip(state: ClipState): void {
    const origin = state.element as HTMLVideoElement;
    const proxy = state.proxyElement ?? null;
    if (origin && !origin.paused) origin.pause();
    if (proxy && !proxy.paused) proxy.pause();
  }

  private cancelPendingSwaps(
    state: ClipState,
    type: 'proxy' | 'origin' | 'all' = 'all'
  ): void {
    if (type === 'proxy' || type === 'all') state.pendingProxySwap = false;
    if (type === 'origin' || type === 'all') state.pendingOriginSwap = false;
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
