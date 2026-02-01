import type { IProject } from '../types/project';

export const DEFAULT_PROJECT: IProject = {
  id: '0',
  name: 'sample project',
  settings: {
    width: 720,
    height: 1280,
    frameRate: 30,
    sampleRate: 44100,
    duration: 1000 * 60,
    background: '#000000',
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  tracks: [],
  assets: [],
};
