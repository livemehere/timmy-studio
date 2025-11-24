import type { IAsset } from '@renderer/lib/studio/types';
import { BehaviorSubject } from 'rxjs';

export class AssetManager {
  private assets: Map<string, IAsset>;

  private isAllLoaded$ = new BehaviorSubject<boolean>(false);

  get isAllLoaded() {
    return this.isAllLoaded$.value;
  }

  constructor(initialAssets: IAsset[] = []) {
    console.debug(
      `[AssetManager] Constructor called with ${initialAssets.length} assets`
    );
    this.assets = new Map();
    initialAssets.forEach((asset) => {
      this.addAsset(asset);
    });
  }

  subscribeToAllLoaded(listener: (isLoaded: boolean) => void): () => void {
    // Immediately invoke the listener with the current state
    listener(this.isAllLoaded);

    const subscription = this.isAllLoaded$.asObservable().subscribe(listener);

    return () => {
      subscription.unsubscribe();
    };
  }

  async loadAllAssets(): Promise<void> {
    console.debug('[AssetManager] loadAllAssets called');
    //TODO
    this.isAllLoaded$.next(true);
    return void 0;
  }

  addAsset(asset: IAsset): void {
    this.assets.set(asset.id, asset);
    console.log(`[AssetManager] Asset added: ${asset.id}`);
  }

  getAssetById<T = IAsset>(id: string) {
    return this.assets.get(id) as T | undefined;
  }

  removeAssetById(id: string): boolean {
    return this.assets.delete(id);
  }

  listAssets(): IAsset[] {
    return Array.from(this.assets.values());
  }

  destroy(): void {
    console.debug('[AssetManager] Destroy called');
    this.assets.clear();
  }
}
