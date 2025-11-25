import type {
  IAsset,
  IVideoAsset,
  IAudioAsset,
  IImageAsset,
} from '@renderer/lib/studio/types';

interface VideoElements {
  origin: HTMLVideoElement;
  proxy?: HTMLVideoElement;
}

export class AssetManager {
  // 메타데이터
  private assets = new Map<string, IAsset>();
  private isInitialLoadDone = false;

  // 실제 DOM Element 인스턴스
  private videoElements = new Map<string, VideoElements>();
  private audioElements = new Map<string, HTMLAudioElement>();
  private imageElements = new Map<string, HTMLImageElement>();

  // 에셋을 로딩하는 중인지 여부
  private isLoading = false;
  // 로딩 상태 추적
  private pendingCount = 0;
  private loadCompleteCount = 0;
  private onLoadEnded: (() => void) | undefined;

  constructor(initialAssets: IAsset[] = []) {
    console.debug(
      `[AssetManager] Constructor called with ${initialAssets.length} assets`
    );
    initialAssets.forEach((asset) => {
      this.assets.set(asset.id, asset);
    });
  }

  private tryToResolveLoadedCallback(): void {
    if (this.loadCompleteCount >= this.pendingCount) {
      console.debug('[AssetManager] All assets loaded!');
      this.onLoadEnded?.();
      this.onLoadEnded = undefined;
      this.isLoading = false;
    }
  }

  // 로딩 상태 관리
  beginToLoading(count: number, callback?: () => void): void {
    if (this.isLoading) {
      throw new Error(
        `[AssetManager] Already in loading state ${this.loadCompleteCount} / ${this.pendingCount}.`
      );
    }

    this.isLoading = true;
    this.pendingCount = count;
    this.loadCompleteCount = 0;
    this.onLoadEnded = callback;
    console.debug(`[AssetManager] beginToLoading : ${count}`);
  }

  private incrementLoaded(): void {
    this.loadCompleteCount++;
    console.debug(
      `[AssetManager] Loaded ${this.loadCompleteCount}/${this.pendingCount}`
    );
    this.tryToResolveLoadedCallback();
  }

  get isAllLoaded(): boolean {
    return this.pendingCount > 0 && this.loadCompleteCount >= this.pendingCount;
  }

  /**
   * 모든 에셋을 병렬로 로드
   * @param onComplete 모든 에셋 로드 완료 후 콜백
   */
  initialLoadAllAssets(onComplete?: () => void): void {
    if (this.isInitialLoadDone) {
      throw new Error(
        '[AssetManager] initialLoadAllAssets has already been called.'
      );
    }
    this.isInitialLoadDone = true;

    const assets = this.listAssets();

    if (assets.length === 0) {
      console.debug(`[AssetManager] loadAllAssets ${assets.length}. Finished.`);
      onComplete?.();
      return;
    }

    console.debug(
      `[AssetManager] Start to loading all assets (${assets.length})`
    );
    this.beginToLoading(assets.length, onComplete);

    for (const asset of assets) {
      this.loadAsset(asset.id).catch((err) => {
        console.error(
          `[AssetManager] Failed to load asset during initial load: ${asset.id}`,
          err
        );
        this.incrementLoaded(); // 실패해도 로드 카운트 증가
      });
    }
  }

  private async loadAsset(assetId: string, isUpdate = false): Promise<void> {
    const asset = this.getAssetById(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    if (asset.type === 'video') {
      await this.loadVideo(assetId, isUpdate);
    } else if (asset.type === 'audio') {
      await this.loadAudio(assetId, isUpdate);
    } else if (asset.type === 'image') {
      await this.loadImage(assetId, isUpdate);
    }

    this.incrementLoaded();
  }

  // Asset 메타데이터 관리
  addAsset(asset: IAsset): void {
    const existing = this.assets.get(asset.id);
    if (existing) {
      throw new Error(`Asset already exists: ${asset.id}`);
    }
    this.assets.set(asset.id, asset);
    this.loadAsset(asset.id).catch((err) => {
      console.error(
        `[AssetManager] Failed to load asset after adding: ${asset.id}`,
        err
      );
      this.incrementLoaded(); // 실패해도 로드 카운트 증가
    });
  }

  updateAsset(id: string, updates: Partial<IAsset>): void {
    const existing = this.assets.get(id);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.assets.set(id, updated);
      console.debug(`[AssetManager] Asset updated: ${id}`);
      this.loadAsset(id, true).catch((err) => {
        console.error(
          `[AssetManager] Failed to load asset after updating: ${id}`,
          err
        );
        this.incrementLoaded(); // 실패해도 로드 카운트 증가
      });
    } else {
      throw new Error(`Asset not found: ${id}`);
    }
  }

  getAssetById<T extends IAsset = IAsset>(id: string): T | undefined {
    return this.assets.get(id) as T | undefined;
  }

  removeAssetById(id: string): boolean {
    // DOM element 정리 (내부 메서드 사용)
    const asset = this.getAssetById(id);
    if (!asset) {
      console.warn(
        `[AssetManager] Attempted to remove non-existent asset: ${id}`
      );
      return false;
    }
    if (asset.type === 'video') {
      this.clearVideoAsset(id);
    } else if (asset.type === 'audio') {
      this.clearAudioAsset(id);
    } else if (asset.type === 'image') {
      this.clearImageAsset(id);
    }
    this.incrementLoaded();
    return this.assets.delete(id);
  }

  listAssets(): IAsset[] {
    return Array.from(this.assets.values());
  }

  // Video Element 관리
  async loadVideo(assetId: string, isUpdate = false): Promise<VideoElements> {
    const asset = this.getAssetById<IVideoAsset>(assetId);
    if (!asset) {
      throw new Error(`Video asset not found: ${assetId}`);
    }

    // 업데이트 시 기존 요소 재사용하면서 변경된 속성만 업데이트
    if (isUpdate && this.videoElements.has(assetId)) {
      const elements = this.videoElements.get(assetId)!;
      let needsReload = false;

      // src 변경 체크
      if (elements.origin.src !== asset.filePath) {
        elements.origin.src = asset.filePath;
        needsReload = true;
      }

      // volume 변경 체크
      const newVolume = asset.volume ?? 1.0;
      if (elements.origin.volume !== newVolume) {
        elements.origin.volume = newVolume;
      }

      // playbackRate 변경 체크
      const newPlaybackRate = asset.playbackRate ?? 1.0;
      if (elements.origin.playbackRate !== newPlaybackRate) {
        elements.origin.playbackRate = newPlaybackRate;
      }

      // proxy 업데이트
      if (elements.proxy) {
        if (asset.proxyFilePath) {
          // proxy src 변경 체크
          if (elements.proxy.src !== asset.proxyFilePath) {
            elements.proxy.src = asset.proxyFilePath;
            needsReload = true;
          }
          if (elements.proxy.volume !== newVolume) {
            elements.proxy.volume = newVolume;
          }
          if (elements.proxy.playbackRate !== newPlaybackRate) {
            elements.proxy.playbackRate = newPlaybackRate;
          }
        } else {
          // proxy 제거됨
          elements.proxy.pause();
          elements.proxy.src = '';
          elements.proxy.removeAttribute('src');
          elements.proxy = undefined;
        }
      } else if (asset.proxyFilePath) {
        // 새로운 proxy 추가
        const proxy = document.createElement('video');
        proxy.src = asset.proxyFilePath;
        proxy.crossOrigin = 'anonymous';
        proxy.preload = 'auto';
        proxy.volume = newVolume;
        proxy.playbackRate = newPlaybackRate;
        elements.proxy = proxy;
        needsReload = true;
      }

      // src가 변경된 경우에만 재로드 대기
      if (needsReload) {
        await new Promise<void>((resolve, reject) => {
          elements.origin.oncanplay = () => resolve();
          elements.origin.onerror = () =>
            reject(new Error(`Failed to reload video: ${asset.filePath}`));
        });

        if (elements.proxy && asset.proxyFilePath) {
          await new Promise<void>((resolve) => {
            elements.proxy!.oncanplay = () => resolve();
            elements.proxy!.onerror = () => {
              console.warn(
                `[AssetManager] Failed to reload proxy: ${asset.proxyFilePath}`
              );
              resolve();
            };
          });
        }
        console.debug(`[AssetManager] Video reloaded: ${assetId}`);
      } else {
        console.debug(`[AssetManager] Video updated (no reload): ${assetId}`);
      }

      return elements;
    }

    // 이미 로드된 경우 재사용
    if (this.videoElements.has(assetId)) {
      return this.videoElements.get(assetId)!;
    }

    // Origin video 로드
    const origin = document.createElement('video');
    origin.src = asset.filePath;
    origin.crossOrigin = 'anonymous';
    origin.preload = 'auto';
    origin.volume = asset.volume ?? 1.0;
    origin.playbackRate = asset.playbackRate ?? 1.0;

    await new Promise<void>((resolve, reject) => {
      origin.oncanplay = () => resolve();
      origin.onerror = () =>
        reject(new Error(`Failed to load video: ${asset.filePath}`));
    });

    const elements: VideoElements = { origin };

    // Proxy video 로드 (있는 경우)
    if (asset.proxyFilePath) {
      const proxy = document.createElement('video');
      proxy.src = asset.proxyFilePath;
      proxy.crossOrigin = 'anonymous';
      proxy.preload = 'auto';
      proxy.volume = asset.volume ?? 1.0;
      proxy.playbackRate = asset.playbackRate ?? 1.0;

      await new Promise<void>((resolve) => {
        proxy.oncanplay = () => resolve();
        proxy.onerror = () => {
          console.warn(
            `[AssetManager] Failed to load proxy: ${asset.proxyFilePath}`
          );
          resolve(); // proxy 로드 실패해도 origin은 사용 가능
        };
      });

      elements.proxy = proxy;
    }

    this.videoElements.set(assetId, elements);
    console.debug(
      `[AssetManager] Video loaded: ${assetId} (proxy: ${!!elements.proxy})`
    );
    return elements;
  }

  getVideo(assetId: string): VideoElements | null {
    return this.videoElements.get(assetId) || null;
  }

  getVideoOrigin(assetId: string): HTMLVideoElement | null {
    return this.videoElements.get(assetId)?.origin || null;
  }

  getVideoProxy(assetId: string): HTMLVideoElement | null {
    return this.videoElements.get(assetId)?.proxy || null;
  }

  // Audio Element 관리
  async loadAudio(
    assetId: string,
    isUpdate = false
  ): Promise<HTMLAudioElement> {
    const asset = this.getAssetById<IAudioAsset>(assetId);
    if (!asset || asset.type !== 'audio') {
      throw new Error(`Audio asset not found: ${assetId}`);
    }

    // 업데이트 시 기존 요소 재사용하면서 변경된 속성만 업데이트
    if (isUpdate && this.audioElements.has(assetId)) {
      const audio = this.audioElements.get(assetId)!;
      let needsReload = false;

      // src 변경 체크
      if (audio.src !== asset.filePath) {
        audio.src = asset.filePath;
        needsReload = true;
      }

      // volume 변경 체크
      const newVolume = asset.volume ?? 1.0;
      if (audio.volume !== newVolume) {
        audio.volume = newVolume;
      }

      // src가 변경된 경우에만 재로드 대기
      if (needsReload) {
        await new Promise<void>((resolve, reject) => {
          audio.oncanplay = () => resolve();
          audio.onerror = () =>
            reject(new Error(`Failed to reload audio: ${asset.filePath}`));
        });
        console.debug(`[AssetManager] Audio reloaded: ${assetId}`);
      } else {
        console.debug(`[AssetManager] Audio updated (no reload): ${assetId}`);
      }

      return audio;
    }

    if (this.audioElements.has(assetId)) {
      return this.audioElements.get(assetId)!;
    }

    const audio = document.createElement('audio');
    audio.src = asset.filePath;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = asset.volume ?? 1.0;

    await new Promise<void>((resolve, reject) => {
      audio.oncanplay = () => resolve();
      audio.onerror = () =>
        reject(new Error(`Failed to load audio: ${asset.filePath}`));
    });

    this.audioElements.set(assetId, audio);
    console.debug(`[AssetManager] Audio loaded: ${assetId}`);
    return audio;
  }

  getAudio(assetId: string): HTMLAudioElement | null {
    return this.audioElements.get(assetId) || null;
  }

  // Image Element 관리
  async loadImage(
    assetId: string,
    isUpdate = false
  ): Promise<HTMLImageElement> {
    const asset = this.getAssetById<IImageAsset>(assetId);
    if (!asset || asset.type !== 'image') {
      throw new Error(`Image asset not found: ${assetId}`);
    }

    // 업데이트 시 기존 요소 재사용하면서 변경된 속성만 업데이트
    if (isUpdate && this.imageElements.has(assetId)) {
      const img = this.imageElements.get(assetId)!;

      // src 변경 체크
      if (img.src !== asset.filePath) {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () =>
            reject(new Error(`Failed to reload image: ${asset.filePath}`));
          img.src = asset.filePath;
        });
        console.debug(`[AssetManager] Image reloaded: ${assetId}`);
      } else {
        console.debug(`[AssetManager] Image updated (no reload): ${assetId}`);
      }

      return img;
    }

    if (this.imageElements.has(assetId)) {
      return this.imageElements.get(assetId)!;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error(`Failed to load image: ${asset.filePath}`));
      img.src = asset.filePath;
    });

    this.imageElements.set(assetId, img);
    console.debug(`[AssetManager] Image loaded: ${assetId}`);
    return img;
  }

  getImage(assetId: string): HTMLImageElement | null {
    return this.imageElements.get(assetId) || null;
  }

  private clearVideoAsset(assetId: string): void {
    const elements = this.videoElements.get(assetId);
    if (!elements) {
      return;
    }
    const v = elements.origin;

    v.pause();
    v.oncanplay = null;
    v.onerror = null;
    v.src = '';
    v.removeAttribute('src');
    v.load();

    if (elements.proxy) {
      const p = elements.proxy;
      p.pause();
      p.oncanplay = null;
      p.onerror = null;
      p.src = '';
      p.removeAttribute('src');
      p.load();
    }

    this.videoElements.delete(assetId);
  }

  private clearAudioAsset(assetId: string): void {
    const audio = this.audioElements.get(assetId);
    if (audio) {
      audio.pause();
      audio.oncanplay = null;
      audio.onerror = null;
      audio.src = '';
      audio.removeAttribute('src');
      audio.load();

      this.audioElements.delete(assetId);
    }
  }

  private clearImageAsset(assetId: string): void {
    const img = this.imageElements.get(assetId);
    if (img) {
      img.onload = null;
      img.onerror = null;
      img.src = '';
      img.removeAttribute('src');

      this.imageElements.delete(assetId);
    }
  }

  destroy(): void {
    console.debug('[AssetManager] Destroy called');

    // 모든 에셋 정리 (내부 메서드 사용)
    for (const assetId of this.videoElements.keys()) {
      this.clearVideoAsset(assetId);
    }
    for (const assetId of this.audioElements.keys()) {
      this.clearAudioAsset(assetId);
    }
    for (const assetId of this.imageElements.keys()) {
      this.clearImageAsset(assetId);
    }

    // 메타데이터 비우기
    this.assets.clear();

    // 상태 초기화
    this.pendingCount = 0;
    this.loadCompleteCount = 0;
    this.onLoadEnded = undefined;
  }
}
