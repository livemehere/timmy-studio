import type { IAsset } from '@renderer/lib/studio/domains/Asset/types';

import type { ITrack } from '@renderer/lib/studio/domains/Track/types';

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
