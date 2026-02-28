import { VideoSource } from 'pixi.js';
import { toFilePath } from '@/lib/studio/utils/toFilePath';
import type { IVideoAsset } from '@/lib/studio/domains/Asset/types';

/**
 * 하나의 origin/proxy HTMLVideoElement + VideoSource 세트.
 * VideoClip이 acquire/release 하며 사용한다.
 */
export interface VideoElementSlot {
  /** 슬롯 고유 ID (디버깅용) */
  readonly slotId: string;
  /** 원본 해상도 비디오 */
  readonly originEl: HTMLVideoElement;
  readonly originVideoSource: VideoSource;
  /** 프록시 (없을 수 있음) */
  proxyEl: HTMLVideoElement | null;
  proxyVideoSource: VideoSource | null;
  /** 현재 이 슬롯을 점유 중인 clipId (null = 유휴) */
  acquiredBy: string | null;
}

/**
 * 한 트랙 내에서 동일 assetId 에 대한 VideoElement 이중 버퍼 풀.
 *
 * 핵심 원칙:
 *  - 같은 트랙 내 클립은 절대 겹치지 않는다 (동시 재생 없음).
 *  - 따라서 같은 asset을 사용하는 클립들은 video element를 공유할 수 있다.
 *  - 이중 버퍼링: asset 당 2 세트를 유지하여
 *    현재 클립이 세트 A 를 사용하는 동안 다음 클립이 세트 B 에 pre-seek 가능.
 *
 * 사용 흐름:
 *  1. GraphicTrack.addClip() → pool.ensureAsset(asset)  (최초 1회)
 *  2. VideoClip.init()       → pool.acquire(assetId, clipId) → VideoElementSlot
 *  3. VideoClip.onBecameHidden() → pool.release(clipId)
 *  4. GraphicTrack.removeClip()  → pool.release(clipId)
 *  5. GraphicTrack.destroy()     → pool.destroy()
 */
export class TrackVideoPool {
  /** assetId → [SlotA, SlotB] */
  private readonly slots = new Map<string, VideoElementSlot[]>();
  /** 중복 생성 방지용 pending promise */
  private readonly pending = new Map<string, Promise<void>>();
  private slotCounter = 0;

  // ── Reactive subscription (for React UI) ──
  private _version = 0;
  private readonly _listeners = new Set<() => void>();

  /** useSyncExternalStore 용 subscribe */
  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  };

  /** useSyncExternalStore 용 getSnapshot */
  getVersion = (): number => this._version;

  private _notifyChange(): void {
    this._version++;
    for (const fn of this._listeners) fn();
  }

  /** 풀에 특정 asset 의 element 세트를 준비한다 (2세트). 이미 있으면 스킵. */
  async ensureAsset(asset: IVideoAsset): Promise<void> {
    if (this.slots.has(asset.id)) return;

    // 이미 생성 중이면 동일 promise 를 대기 (race condition 방지)
    const inflight = this.pending.get(asset.id);
    if (inflight) return inflight;

    const work = (async () => {
      const [slotA, slotB] = await Promise.all([
        this.createSlot(asset),
        this.createSlot(asset),
      ]);
      this.slots.set(asset.id, [slotA, slotB]);
      this.pending.delete(asset.id);
    })();

    this.pending.set(asset.id, work);
    return work;
  }

  /**
   * 클립이 슬롯을 점유한다.
   * 유휴 슬롯이 있으면 반환, 둘 다 점유 중이면 null.
   * (같은 트랙 내에서 겹치지 않으므로 정상 흐름에선 항상 유휴 슬롯이 존재)
   */
  acquire(assetId: string, clipId: string): VideoElementSlot | null {
    const assetSlots = this.slots.get(assetId);
    if (!assetSlots) return null;

    // 이미 이 클립이 점유 중인 슬롯이 있으면 그대로 반환
    const existing = assetSlots.find((s) => s.acquiredBy === clipId);
    if (existing) return existing;

    // 유휴 슬롯 반환
    const free = assetSlots.find((s) => s.acquiredBy === null);
    if (free) {
      free.acquiredBy = clipId;
      this._notifyChange();
      return free;
    }

    console.warn(
      `[TrackVideoPool] No free slot for asset(${assetId}), clip(${clipId}). All slots occupied.`
    );
    return null;
  }

  /** 클립이 슬롯 점유를 해제한다. */
  release(clipId: string): void {
    for (const assetSlots of this.slots.values()) {
      for (const slot of assetSlots) {
        if (slot.acquiredBy === clipId) {
          slot.acquiredBy = null;
          // 해제 시 비디오 일시정지
          slot.originEl.pause();
          slot.proxyEl?.pause();
          this._notifyChange();
          return;
        }
      }
    }
  }

  /** 특정 asset 의 슬롯에 프록시를 핫스왑 (lazy proxy init 시) */
  async hotSwapProxy(asset: IVideoAsset): Promise<void> {
    const assetSlots = this.slots.get(asset.id);
    if (!assetSlots) return;

    for (const slot of assetSlots) {
      if (slot.proxyEl) continue; // 이미 프록시 있음
      if (!asset.proxyFilePath) continue;

      try {
        const proxyEl = await this.createVideoElement(asset.proxyFilePath);
        proxyEl.pause();
        proxyEl.currentTime = 0;
        const proxyVideoSource = new VideoSource({
          resource: proxyEl,
          autoPlay: false,
        });
        slot.proxyEl = proxyEl;
        slot.proxyVideoSource = proxyVideoSource;
      } catch {
        // 프록시 로드 실패 — 무시
      }
    }
  }

  /** 특정 asset 의 슬롯을 조회 (디버깅/검사용) */
  getSlots(assetId: string): readonly VideoElementSlot[] | undefined {
    return this.slots.get(assetId);
  }

  /** 풀에 해당 asset 이 존재하는지 */
  hasAsset(assetId: string): boolean {
    return this.slots.has(assetId);
  }

  /**
   * 특정 clip 에 대한 풀 상태 요약을 반환한다.
   * Timeline UI 에서 표시용.
   */
  getClipPoolInfo(
    assetId: string,
    clipId: string
  ): { totalSlots: number; usedSlots: number; thisAcquired: boolean } | null {
    const assetSlots = this.slots.get(assetId);
    if (!assetSlots) return null;
    return {
      totalSlots: assetSlots.length,
      usedSlots: assetSlots.filter((s) => s.acquiredBy !== null).length,
      thisAcquired: assetSlots.some((s) => s.acquiredBy === clipId),
    };
  }

  /** 풀 전체 정리 */
  destroy(): void {
    for (const assetSlots of this.slots.values()) {
      for (const slot of assetSlots) {
        this.cleanupSlot(slot);
      }
    }
    this.slots.clear();
  }

  /** 특정 asset 의 슬롯만 정리 (asset이 제거될 때) */
  removeAsset(assetId: string): void {
    const assetSlots = this.slots.get(assetId);
    if (!assetSlots) return;
    for (const slot of assetSlots) {
      this.cleanupSlot(slot);
    }
    this.slots.delete(assetId);
  }

  // ─── Internal ───

  private async createSlot(asset: IVideoAsset): Promise<VideoElementSlot> {
    const slotId = `slot-${++this.slotCounter}`;

    const originEl = await this.createVideoElement(asset.filePath);
    originEl.pause();
    originEl.currentTime = 0;
    const originVideoSource = new VideoSource({
      resource: originEl,
      autoPlay: false,
    });

    let proxyEl: HTMLVideoElement | null = null;
    let proxyVideoSource: VideoSource | null = null;
    if (asset.proxyFilePath) {
      try {
        proxyEl = await this.createVideoElement(asset.proxyFilePath);
        proxyEl.pause();
        proxyEl.currentTime = 0;
        proxyVideoSource = new VideoSource({
          resource: proxyEl,
          autoPlay: false,
        });
      } catch {
        // 프록시 로드 실패 — origin 만 사용
      }
    }

    return {
      slotId,
      originEl,
      originVideoSource,
      proxyEl,
      proxyVideoSource,
      acquiredBy: null,
    };
  }

  private async createVideoElement(
    filePath: string
  ): Promise<HTMLVideoElement> {
    const video = document.createElement('video');
    video.src = toFilePath(filePath);
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.volume = 1.0;
    video.playbackRate = 1.0;

    await new Promise<void>((resolve, reject) => {
      video.oncanplay = () => resolve();
      video.onerror = () =>
        reject(new Error(`Failed to load video: ${filePath}`));
    });
    return video;
  }

  private cleanupVideoElement(video: HTMLVideoElement): void {
    video.pause();
    video.oncanplay = null;
    video.onerror = null;
    video.removeAttribute('src');
    video.src = '';
    video.load();
  }

  private cleanupSlot(slot: VideoElementSlot): void {
    this.cleanupVideoElement(slot.originEl);
    if (slot.proxyEl) {
      this.cleanupVideoElement(slot.proxyEl);
    }
    slot.acquiredBy = null;
  }
}
