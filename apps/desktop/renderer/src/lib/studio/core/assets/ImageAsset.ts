import type { IImageAsset } from '@renderer/lib/studio/types';
import { Texture } from 'pixi.js';
import { BehaviorSubject } from 'rxjs';

export type ImageLoadState = 'idle' | 'loading' | 'loaded' | 'error';

export class ImageAsset implements IImageAsset {
  type: 'image' = 'image';
  id: string;
  name: string;
  filePath: string;
  metadata: IImageAsset['metadata'];
  thumbnail?: string;

  // Loading state
  readonly loadState$ = new BehaviorSubject<ImageLoadState>('idle');
  private htmlImage: HTMLImageElement | null = null;
  private texture: Texture | null = null;
  private loadError: Error | null = null;

  constructor(props: IImageAsset) {
    this.id = props.id;
    this.name = props.name;
    this.filePath = props.filePath;
    this.metadata = props.metadata;
    this.thumbnail = props.thumbnail;
  }

  /**
   * Get the HTMLImageElement (creates and loads if not exists)
   */
  async getImage(): Promise<HTMLImageElement> {
    if (this.htmlImage && this.loadState$.value === 'loaded') {
      return this.htmlImage;
    }

    if (this.loadState$.value === 'loading') {
      // Wait for current loading to complete
      return new Promise((resolve, reject) => {
        const subscription = this.loadState$.subscribe((state) => {
          if (state === 'loaded' && this.htmlImage) {
            subscription.unsubscribe();
            resolve(this.htmlImage);
          } else if (state === 'error') {
            subscription.unsubscribe();
            reject(this.loadError || new Error('Failed to load image'));
          }
        });
      });
    }

    return this.load();
  }

  /**
   * Get the PixiJS Texture (creates from image if not exists)
   */
  async getTexture(): Promise<Texture> {
    if (this.texture) {
      return this.texture;
    }

    const image = await this.getImage();
    this.texture = Texture.from(image);
    return this.texture;
  }

  /**
   * Load the image
   */
  private async load(): Promise<HTMLImageElement> {
    this.loadState$.next('loading');

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Enable CORS for external images

      img.onload = () => {
        this.htmlImage = img;
        this.loadState$.next('loaded');
        resolve(img);
      };

      img.onerror = (error) => {
        this.loadError = new Error(`Failed to load image: ${this.filePath}`);
        this.loadState$.next('error');
        console.error('[ImageAsset] Load error:', this.filePath, error);
        reject(this.loadError);
      };

      img.src = this.filePath;
    });
  }

  /**
   * Preload the image without waiting
   */
  preload(): void {
    if (this.loadState$.value === 'idle') {
      this.load().catch((error) => {
        console.warn('[ImageAsset] Preload failed:', error);
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
   * Destroy the asset and cleanup resources
   */
  destroy(): void {
    this.loadState$.complete();

    if (this.texture) {
      this.texture.destroy(true);
      this.texture = null;
    }

    if (this.htmlImage) {
      this.htmlImage.src = '';
      this.htmlImage = null;
    }
  }
}
