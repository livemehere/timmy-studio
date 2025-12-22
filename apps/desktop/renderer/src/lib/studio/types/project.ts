import type { IAsset } from './asset';
import type { ITrack } from './track';

export interface IProject {
  id: string;
  name: string;
  settings: IProjectSettings;
  metadata: IProjectMetadata;
  tracks: ITrack[];
  assets: IAsset[];
}

export interface IProjectSettings {
  width: number;
  height: number;
  frameRate: number;
  sampleRate: number;
  duration: number;
  background: string;
}

export interface IProjectMetadata {
  createdAt: string;
  updatedAt: string;
  author?: string;
  description?: string;
}
