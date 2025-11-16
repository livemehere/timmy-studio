import type { IVideoAsset } from '@renderer/lib/studio/types';
import { Texture } from 'pixi.js';
import { BehaviorSubject } from 'rxjs';

export type VideoLoadState = 'idle' | 'loading' | 'loaded' | 'error';

export class VideoAsset implements IVideoAsset {
  type: 'video' = 'video';
  id: string;
  name: string;
  filePath: string;
  metadata: IVideoAsset['metadata'];
  thumbnail?: string;

  // Loading state
  readonly loadState$ = new BehaviorSubject<VideoLoadState>('idle');
  private htmlVideo: HTMLVideoElement | null = null;
  private texture: Texture | null = null;
  private loadError: Error | null = null;

  constructor(props: IVideoAsset) {
    this.id = props.id;
    this.name = props.name;
    this.filePath = props.filePath;
    this.metadata = props.metadata;
    this.thumbnail = props.thumbnail;
  }

  /**
   * Get the HTMLVideoElement (creates and loads if not exists)
   */
  async getVideo(): Promise<HTMLVideoElement> {
    if (this.htmlVideo && this.loadState$.value === 'loaded') {
      return this.htmlVideo;
    }

    if (this.loadState$.value === 'loading') {
      // Wait for current loading to complete
      return new Promise((resolve, reject) => {
        const subscription = this.loadState$.subscribe((state) => {
          if (state === 'loaded' && this.htmlVideo) {
            subscription.unsubscribe();
            resolve(this.htmlVideo);
          } else if (state === 'error') {
            subscription.unsubscribe();
            reject(this.loadError || new Error('Failed to load video'));
          }
        });
      });
    }

    return this.load();
  }

  /**
   * Get the PixiJS Texture (creates from video if not exists)
   */
  async getTexture(): Promise<Texture> {
    if (this.texture) {
      return this.texture;
    }

    const video = await this.getVideo();

    // Create texture with autoUpdate enabled for video
    this.texture = Texture.from(video, {
      resourceOptions: {
        autoPlay: false, // We control playback manually
        updateFPS: 0, // Update every frame
      },
    });

    // Mark texture source as updateable
    if (this.texture.source) {
      this.texture.source.autoUpdate = true;
    }

    return this.texture;
  }

  /**
   * Load the video
   */
  private async load(): Promise<HTMLVideoElement> {
    this.loadState$.next('loading');

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous'; // Enable CORS for external videos
      video.preload = 'auto';
      video.muted = true; // Mute for autoplay compatibility
      video.playsInline = true;

      // Handle successful load
      const onCanPlay = () => {
        this.htmlVideo = video;
        this.loadState$.next('loaded');
        cleanup();
        resolve(video);
      };

      // Handle error
      const onError = (error: Event | string) => {
        this.loadError = new Error(`Failed to load video: ${this.filePath}`);
        this.loadState$.next('error');
        console.error('[VideoAsset] Load error:', this.filePath, error);
        cleanup();
        reject(this.loadError);
      };

      const cleanup = () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
      };

      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onError);

      // Set the source
      video.src = this.filePath;
      video.load();
    });
  }

  /**
   * Preload the video without waiting
   */
  preload(): void {
    if (this.loadState$.value === 'idle') {
      this.load().catch((error) => {
        console.warn('[VideoAsset] Preload failed:', error);
      });
    }
  }

  /**
   * Get current load state
   */
  get isLoaded(): boolean {
    return this.loadState$.value === 'loaded';
  }

  get isLoading(): boolean {
    return this.loadState$.value === 'loading';
  }

  get hasError(): boolean {
    return this.loadState$.value === 'error';
  }

  /**
   * Get video duration (available after loaded)
   */
  get duration(): number {
    return this.htmlVideo?.duration ?? 0;
  }

  /**
   * Destroy the asset and cleanup resources
   */
  destroy(): void {
    this.loadState$.complete();

    if (this.texture) {
      this.texture.destroy(true);
      this.texture = null;
    }

    if (this.htmlVideo) {
      this.htmlVideo.pause();
      this.htmlVideo.src = '';
      this.htmlVideo.load();
      this.htmlVideo = null;
    }
  }
}
