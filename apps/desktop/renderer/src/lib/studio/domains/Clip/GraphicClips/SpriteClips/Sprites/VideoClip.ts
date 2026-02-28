import { Texture, VideoSource } from 'pixi.js';
import type { IVideoClip } from '../../../types';
import { SpriteClip } from '../SpriteClip';
import { GraphicRenderer } from '@/lib/studio/engine/GraphicRenderer';
import type { SeekingRenderMode, TickContext } from '@/lib/studio/engine/types';
import type { IVideoAsset } from '../../../../Asset/types';
import type {
  TrackVideoPool,
  VideoElementSlot,
} from '@/lib/studio/engine/TrackVideoPool';

/** Debounce delay for backward seeks on origin (no proxy) */
const BACKWARD_SEEK_DEBOUNCE_MS = 300;

export class VideoClip extends SpriteClip {
  readonly type = 'video';
  declare protected _data: IVideoClip;

  // ── Pool-based state ──
  private pool: TrackVideoPool | null = null;
  private slot: VideoElementSlot | null = null;

  // Convenience accessors
  private get originEl(): HTMLVideoElement | null {
    return this.slot?.originEl ?? null;
  }
  private get proxyEl(): HTMLVideoElement | null {
    return this.slot?.proxyEl ?? null;
  }
  private get originVideoSource(): VideoSource | undefined {
    return this.slot?.originVideoSource;
  }
  private get proxyVideoSource(): VideoSource | null | undefined {
    return this.slot?.proxyVideoSource;
  }

  // Swap / visibility state
  private isUsingProxy = false;
  private pendingProxySwap = false;
  private pendingOriginSwap = false;
  private _wasVisible = false;

  // Backward seek debounce state (used when no proxy)
  private _backwardDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastSeekTime = -1;

  // Lazy proxy hot-swap state
  private _proxyInitAttempted = false;

  // VideoClip은 항상 origin 기준으로 contentSize 반환 (proxy는 해상도가 낮음)
  protected override getContentSize(): { width: number; height: number } {
    const el = this.originEl;
    if (!el) return { width: 0, height: 0 };
    return {
      width: el.videoWidth || 0,
      height: el.videoHeight || 0,
    };
  }

  constructor(renderer: GraphicRenderer, data: IVideoClip) {
    super(renderer, data);
    this.debugCall(`(Video) constructor`);
  }

  /** 외부에서 pool 을 주입한다 (GraphicTrack.addClip 에서 호출) */
  setPool(pool: TrackVideoPool): void {
    this.pool = pool;
  }

  async init(): Promise<void> {
    this.debugCall('=== (Video) init ===');

    if (!this.pool) {
      throw new Error(
        `[VideoClip] Pool not set for clip ${this.id}. Call setPool() before init().`
      );
    }

    // 슬롯 acquire 는 onBecameVisible / onTick 에서 lazy 로 수행.
    // 같은 asset 의 클립이 2개 이상이면 동시에 acquire 하면 슬롯 부족.
    // sync (applyData + applyTransform) 도 슬롯 확보 후 호출해야 함.
    // (getContentSize 가 videoWidth/Height 를 참조하므로 slot 없으면 0×0 → transform 깨짐)
    this.applyData();
    this.debugCall('(Video) === init-end ===');
  }

  destroy(): void {
    this.debugCall('(Video) destroy');
    this._clearBackwardDebounce();
    // 슬롯 반환 (element 는 pool 이 관리)
    if (this.pool && this.slot) {
      this.pool.release(this.id);
      this.slot = null;
    }
    super.destroy();
  }

  override onBecameVisible(ctx: TickContext): void {
    super.onBecameVisible(ctx);
    this._wasVisible = true;

    // 슬롯이 없으면 pool 에서 acquire
    if (!this.slot && this.pool) {
      const slot = this.pool.acquire(this._data.assetId, this.id);
      if (slot) {
        this.slot = slot;
        // texture 재연결 + transform 재계산 (content size 가 slot 의 videoWidth 에 의존)
        this.rebindTexture();
        this.applyTransform(this.data.transforms);
      }
    }

    // 슬롯이 확보된 상태라면, 현재 시간으로 강제 seek (isSeeking=false 인 경우 대비)
    if (this.slot) {
      const relTime = this.calcRelTime(ctx.currentTime);
      this.handleSeeking(relTime);
    }
  }

  override onBecameHidden(ctx: TickContext): void {
    super.onBecameHidden(ctx);
    this._wasVisible = false;
    this.cancelPendingSwaps('all');
    this.isUsingProxy = false;

    // 비디오 정지
    if (this.originEl && !this.originEl.paused) {
      this.debugCall('pausing video (became hidden)');
      this.originEl.pause();
    }
    if (this.proxyEl && !this.proxyEl.paused) {
      this.proxyEl.pause();
    }

    // 슬롯 반환 → 다른 클립이 사용 가능
    if (this.pool && this.slot) {
      this.pool.release(this.id);
      this.slot = null;
    }
  }

  override onTick(ctx: TickContext): void {
    super.onTick(ctx);

    // Lazy slot acquisition — 첫 tick 시 onBecameVisible 이 불리지 않으므로 여기서 처리
    if (!this.slot && this.pool) {
      const slot = this.pool.acquire(this._data.assetId, this.id);
      if (slot) {
        this.slot = slot;
        this._wasVisible = true;
        this.rebindTexture();
        this.applyTransform(this.data.transforms);
        const relTime = this.calcRelTime(ctx.currentTime);
        this.handleSeeking(relTime);
      }
    }

    if (!this.slot) return; // 슬롯 미확보 시 스킵

    const { currentTime, isPlaying, playStateChanged, isSeeking } = ctx;
    const relTime = this.calcRelTime(currentTime);

    if (isPlaying) {
      this.cancelPendingSwaps('proxy');

      if (this.isUsingProxy && this.proxyEl && !this.pendingOriginSwap) {
        this.debugCall('swap proxy -> origin (during playback)');
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
      // Proxy available — fast path
      this._clearBackwardDebounce();
      if (this.isUsingProxy) {
        this.seekWithDirty(this.proxyEl!, clipRelativeTime);
      } else {
        // proxy 를 아직 사용하지 않으면 origin 으로 일단 맞추고 proxy 스왑 요청
        this.seekWithDirty(this.originEl!, clipRelativeTime);
        this.requestSwapToProxyWithDirty();
      }
    } else {
      // === origin 모드 (no proxy or export) ===
      this.cancelPendingSwaps('proxy');

      if (this.isUsingProxy && !this.pendingOriginSwap) {
        this.requestSwapToOrigin({ targetTime: clipRelativeTime });
        return;
      }

      // Direction-based strategy when seeking on origin (editing mode, no proxy yet)
      if (this.renderer.seekingRenderMode === 'proxy' && !this.proxyEl) {
        // No proxy available — use direction heuristic
        const isBackward = clipRelativeTime < this._lastSeekTime;
        this._lastSeekTime = clipRelativeTime;

        if (isBackward) {
          // Backward = random access, debounce
          this._scheduleBackwardSeek(clipRelativeTime);
          return;
        }
        // Forward = sequential decode, proceed normally
        this._clearBackwardDebounce();
      }

      this.seekWithDirty(this.originEl!, clipRelativeTime);
    }
  }

  private decideSeekingMode(): SeekingRenderMode {
    // Try lazy hot-swap if proxy not yet initialized on pool slots
    if (!this.proxyEl && !this._proxyInitAttempted) {
      this._tryLazyProxyInit();
    }
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
    this.sprite.texture = new Texture({ source: videoSource! });
    const originSize = this.getContentSize();
    this.sprite.width = originSize.width;
    this.sprite.height = originSize.height;

    // 일시정지 상태라면 비디오도 일시정지
    if (!this.renderer.timer.isPlaying) {
      targetEl.pause();
    }
  }

  /**
   * 현재 슬롯의 VideoSource 로 sprite texture 를 재바인딩한다.
   * 슬롯 acquire / re-acquire 시 호출.
   */
  private rebindTexture(): void {
    const oldTexture = this.sprite.texture;
    if (oldTexture) {
      oldTexture.destroy(false);
    }

    const videoSource = this.isUsingProxy
      ? this.proxyVideoSource
      : this.originVideoSource;
    if (!videoSource) return;

    this.sprite.texture = new Texture({ source: videoSource });
    const size = this.getContentSize();
    this.sprite.width = size.width;
    this.sprite.height = size.height;
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

  // ── Backward seek debounce ──

  private _scheduleBackwardSeek(targetTime: number): void {
    this._clearBackwardDebounce();
    this._backwardDebounceTimer = setTimeout(() => {
      this._backwardDebounceTimer = null;
      this.seekWithDirty(this.originEl!, targetTime);
    }, BACKWARD_SEEK_DEBOUNCE_MS);
  }

  private _clearBackwardDebounce(): void {
    if (this._backwardDebounceTimer !== null) {
      clearTimeout(this._backwardDebounceTimer);
      this._backwardDebounceTimer = null;
    }
  }

  // ── Lazy proxy hot-swap ──

  /**
   * Check if the proxy file has become ready since init.
   * Called lazily on each seek decision.
   * Uses a flag (_proxyInitAttempted) so we only try once per "not ready" cycle.
   * Resets if the asset updates with isProxyReady=true.
   */
  private _tryLazyProxyInit(): void {
    if (!this.pool) return;

    const asset = this.renderer
      .getDoc()
      .assets.find((a) => a.id === this._data.assetId) as
      | IVideoAsset
      | undefined;

    if (!asset || !asset.isProxyReady || !asset.proxyFilePath) {
      // Not ready yet — don't keep retrying every tick
      this._proxyInitAttempted = true;
      return;
    }

    this.debugCall('(Video) lazy proxy init via pool — proxy became ready');
    this._proxyInitAttempted = true;

    // pool 을 통해 모든 슬롯에 proxy 핫스왑
    this.pool.hotSwapProxy(asset).catch((err) => {
      console.warn(
        `[VideoClip] Pool proxy hot-swap failed for ${this.id}`,
        err
      );
    });
  }

  /**
   * Called externally (e.g. from AssetUpdater) to notify that the asset has been
   * updated. Resets the lazy-init flag so we try again on the next seek.
   */
  notifyAssetUpdated(): void {
    this._proxyInitAttempted = false;
  }
}
