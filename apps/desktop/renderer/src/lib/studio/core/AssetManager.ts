import type { IAsset } from '@renderer/lib/studio/types';

export class AssetManager {
  private assets: Map<string, IAsset>;

  constructor(initialAssets: IAsset[] = []) {
    this.assets = new Map();
    initialAssets.forEach((asset) => this.assets.set(asset.id, asset));
  }

  addAsset(asset: IAsset): void {
    this.assets.set(asset.id, asset);
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
}
