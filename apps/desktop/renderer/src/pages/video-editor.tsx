import { StudioProvider } from '@/lib/studio/providers/StudioProvider';
import { StudioApp } from '@/lib/studio/components';
import type { IProject } from '@/lib/studio/types/project';

const DEFAULT_PROJECT: IProject = {
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

let autoSaved: IProject | null = null;
try {
  const autoSavedStr = window.localStorage.getItem('autosave-doc');
  if (!autoSavedStr) throw new Error('No autosave data');
  autoSaved = JSON.parse(autoSavedStr) as IProject;
} catch (e) {
  autoSaved = null;
}

const initialProject = autoSaved || DEFAULT_PROJECT;

export default function VideoEditorPage() {
  return (
    <StudioProvider initialProject={initialProject}>
      <StudioApp />
    </StudioProvider>
  );
}
