import type { IVideoMediaClip, ITransform } from '@renderer/lib/studio/types';
import type { PlaybackContext } from '@renderer/lib/studio/core/Timer';
import { Container, Sprite, Texture, Graphics } from 'pixi.js';
import { BehaviorSubject, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import isEqual from 'fast-deep-equal';
import { Studio } from '@renderer/lib/studio/core/Studio';

export class VideoMediaClip implements IVideoMediaClip {
  type: 'video' = 'video';
  id: string;
  name: string;

  startTime: number;
  endTime: number;

  assetId: string;
  trimStart: number;
  trimEnd: number;

  // Public getters/setters to maintain interface compatibility
  get transforms(): ITransform {
    return this.transforms$.value;
  }

  set transforms(value: ITransform) {
    this.transforms$.next(value);
  }

  // Internal reactive state
  private readonly transforms$: BehaviorSubject<ITransform>;

  private readonly container: Container;
  private sprite: Sprite;
  private placeholder: Graphics | null = null;
  private readonly subscriptions: Subscription = new Subscription();

  private videoElement: HTMLVideoElement | null = null;
  private isPlaying = false;

  constructor(props: IVideoMediaClip) {
    this.id = props.id;
    this.name = props.name;

    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.assetId = props.assetId;
    this.trimStart = props.trimStart;
    this.trimEnd = props.trimEnd;

    // Initialize reactive state
    this.transforms$ = new BehaviorSubject<ITransform>(props.transforms);

    this.container = new Container();
    this.container.label = `VideoMediaClip-${this.id}`;

    // Create sprite with placeholder
    this.sprite = new Sprite(Texture.EMPTY);
    this.sprite.anchor.set(0.5, 0.5);
    this.container.addChild(this.sprite);

    // Create placeholder rectangle
    this.createPlaceholder();

    // Load the actual video
    this.loadVideo();

    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // Subscribe to transforms changes to update container
    this.subscriptions.add(
      this.transforms$
        .pipe(distinctUntilChanged(isEqual))
        .subscribe((transforms) => {
          this.applyTransforms(transforms);
        })
    );
  }

  private createPlaceholder() {
    // Create a placeholder rectangle while video is loading
    this.placeholder = new Graphics();
    this.placeholder.rect(-200, -112.5, 400, 225); // Default 400x225 placeholder (16:9)
    this.placeholder.fill({ color: 0x222222 });
    this.placeholder.stroke({ width: 2, color: 0x555555 });

    this.container.addChild(this.placeholder);
  }

  private async loadVideo() {
    const asset = Studio.getAsset(this.assetId);

    if (!asset) {
      console.error(`[VideoMediaClip] Asset not found: ${this.assetId}`);
      return;
    }

    // Subscribe to asset load state
    const loadStateSubscription = asset.loadState$.subscribe((state) => {
      if (state === 'loaded') {
        this.onVideoLoaded();
      } else if (state === 'error') {
        console.error(`[VideoMediaClip] Failed to load asset: ${this.assetId}`);
      }
    });

    this.subscriptions.add(loadStateSubscription);

    // If already loaded, apply immediately
    if (asset.isLoaded) {
      this.onVideoLoaded();
    }
  }

  private async onVideoLoaded() {
    const asset = Studio.getAsset(this.assetId);
    if (!asset) return;

    try {
      const video = await asset.getVideo();
      const texture = await asset.getTexture();

      this.videoElement = video;
      this.sprite.texture = texture;

      // Remove placeholder
      if (this.placeholder) {
        this.container.removeChild(this.placeholder);
        this.placeholder.destroy();
        this.placeholder = null;
      }

      // Reapply transforms after texture is loaded
      this.applyTransforms(this.transforms);

      console.log(`[VideoMediaClip] Video loaded: ${this.assetId}`);
    } catch (error) {
      console.error(
        `[VideoMediaClip] Failed to get texture: ${this.assetId}`,
        error
      );
    }
  }

  private applyTransforms(transforms: ITransform) {
    const { position, scaleX, scaleY, opacity, rotation, anchorX, anchorY } =
      transforms;

    // Update sprite anchor if specified
    if (anchorX !== undefined || anchorY !== undefined) {
      this.sprite.anchor.set(anchorX ?? 0.5, anchorY ?? 0.5);
    }

    this.container.position.set(position.x, position.y);
    this.container.scale.set(scaleX ?? 1, scaleY ?? 1);
    this.container.rotation = rotation ?? 0;
    this.container.alpha = opacity ?? 1;
  }

  add(parent: Container) {
    parent.addChild(this.container);
  }

  update(context: PlaybackContext) {
    // Sync video playback with timeline
    if (!this.videoElement) return;

    const { currentTime, mode } = context;

    // Calculate what time in the video we should be at
    // Timeline position relative to clip start
    const timeInClip = currentTime - this.startTime;

    // Map timeline position to video time using trim range
    // If clip is 6s (0-6000ms) and trim is 6s (0-6000ms), playback is 1:1
    // If clip is 6s but trim is 3s (0-3000ms), video plays at 0.5x speed
    // If clip is 6s but trim is 12s (0-12000ms), video plays at 2x speed
    const clipDuration = this.endTime - this.startTime;
    const trimDuration = this.trimEnd - this.trimStart;
    // const playbackRate = trimDuration / clipDuration;

    // Apply playback rate to video element
    // this.videoElement.playbackRate = playbackRate;

    // Calculate current video time (in milliseconds from video start)
    const videoTimeMs = this.trimStart + timeInClip;
    const videoTimeInSeconds = videoTimeMs / 1000;

    if (mode === 'seeking') {
      // SEEKING MODE: Force immediate seek
      this.videoElement.currentTime = videoTimeInSeconds;

      // Pause during seeking for better performance
      if (this.isPlaying) {
        this.videoElement.pause();
        this.isPlaying = false;
      }
    } else if (mode === 'playing') {
      // PLAYING MODE: Let video play smoothly, only sync if drift is too large
      const timeDiff = Math.abs(
        this.videoElement.currentTime - videoTimeInSeconds
      );

      // Only seek if difference is significant (> 300ms) to avoid interrupting playback
      if (timeDiff > 0.3) {
        this.videoElement.currentTime = videoTimeInSeconds;
      }

      // Play if not already playing
      if (this.container.visible && !this.isPlaying) {
        this.videoElement.play().catch((error) => {
          console.warn('[VideoMediaClip] Play failed:', error);
        });
        this.isPlaying = true;
      }
    } else if (mode === 'paused') {
      // PAUSED MODE: Sync time but keep paused
      const timeDiff = Math.abs(
        this.videoElement.currentTime - videoTimeInSeconds
      );

      if (timeDiff > 0.1) {
        this.videoElement.currentTime = videoTimeInSeconds;
      }

      if (this.isPlaying) {
        this.videoElement.pause();
        this.isPlaying = false;
      }
    }

    // Always pause when not visible
    if (!this.container.visible && this.isPlaying) {
      this.videoElement.pause();
      this.isPlaying = false;
    }
  }

  show() {
    if (this.container.visible) return;
    this.container.visible = true;
  }

  hide() {
    if (!this.container.visible) return;
    this.container.visible = false;

    // Pause video when hidden
    if (this.videoElement && this.isPlaying) {
      this.videoElement.pause();
      this.isPlaying = false;
    }
  }

  destroy() {
    // Pause and cleanup video
    if (this.videoElement) {
      this.videoElement.pause();
      this.isPlaying = false;
    }

    // Unsubscribe from all observables
    this.subscriptions.unsubscribe();

    // Complete subjects
    this.transforms$.complete();

    // Destroy sprite texture if not a shared texture
    if (
      this.sprite.texture &&
      this.sprite.texture !== Texture.WHITE &&
      this.sprite.texture !== Texture.EMPTY
    ) {
      // Note: Don't destroy the texture as it's shared from the asset
      // The asset will handle texture cleanup
    }

    // Destroy container and children
    this.container.destroy({ children: true });
  }
}
