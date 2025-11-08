import type { IImageClip, ITransform } from '@renderer/lib/studio/types';
import { Container, Sprite, Texture, Graphics } from 'pixi.js';
import { BehaviorSubject, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import isEqual from 'fast-deep-equal';
import { Studio } from '@renderer/lib/studio/core/Studio';

export class ImageClip implements IImageClip {
  type: 'image' = 'image';
  id: string;
  name: string;

  startTime: number;
  endTime: number;

  assetId: string;

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

  constructor(props: IImageClip) {
    this.id = props.id;
    this.name = props.name;

    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.assetId = props.assetId;

    // Initialize reactive state
    this.transforms$ = new BehaviorSubject<ITransform>(props.transforms);

    this.container = new Container();
    this.container.label = `ImageClip-${this.id}`;

    // Create sprite with placeholder
    this.sprite = new Sprite(Texture.EMPTY);
    this.sprite.anchor.set(0.5, 0.5);
    this.container.addChild(this.sprite);

    // Create placeholder rectangle
    this.createPlaceholder();

    // Load the actual image
    this.loadImage();

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
    // Create a placeholder rectangle while image is loading
    this.placeholder = new Graphics();
    this.placeholder.rect(-100, -75, 200, 150); // Default 200x150 placeholder
    this.placeholder.fill({ color: 0x333333 });
    this.placeholder.stroke({ width: 2, color: 0x666666 });

    // Add text indicator
    this.container.addChild(this.placeholder);
  }

  private async loadImage() {
    const asset = Studio.getAsset(this.assetId);

    if (!asset) {
      console.error(`[ImageClip] Asset not found: ${this.assetId}`);
      return;
    }

    // Subscribe to asset load state
    const loadStateSubscription = asset.loadState$.subscribe((state) => {
      if (state === 'loaded') {
        this.onImageLoaded();
      } else if (state === 'error') {
        console.error(`[ImageClip] Failed to load asset: ${this.assetId}`);
      }
    });

    this.subscriptions.add(loadStateSubscription);

    // If already loaded, apply immediately
    if (asset.isLoaded) {
      this.onImageLoaded();
    }
  }

  private async onImageLoaded() {
    const asset = Studio.getAsset(this.assetId);
    if (!asset) return;

    try {
      const texture = await asset.getTexture();
      this.sprite.texture = texture;

      // Remove placeholder
      if (this.placeholder) {
        this.container.removeChild(this.placeholder);
        this.placeholder.destroy();
        this.placeholder = null;
      }

      // Reapply transforms after texture is loaded
      this.applyTransforms(this.transforms);

      console.log(`[ImageClip] Image loaded: ${this.assetId}`);
    } catch (error) {
      console.error(`[ImageClip] Failed to get texture: ${this.assetId}`, error);
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

  update(_currentTime: number) {
    // No-op: All updates are handled reactively via subscriptions
    // This method exists only to satisfy the interface contract
  }

  show() {
    if (this.container.visible) return;
    this.container.visible = true;
  }

  hide() {
    if (!this.container.visible) return;
    this.container.visible = false;
  }

  destroy() {
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
      this.sprite.texture.destroy(true);
    }

    // Destroy container and children
    this.container.destroy({ children: true });
  }
}
