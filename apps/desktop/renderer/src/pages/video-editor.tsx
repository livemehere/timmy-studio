import { StudioProvider } from '@renderer/lib/studio/contexts/StudioProvider';
import { StudioApp } from '@renderer/lib/studio/components';
import type { IProject } from '@renderer/lib/studio/types/project';

const mock: IProject = {
  id: 'fe52',
  name: 'sample project',
  settings: {
    width: 720,
    height: 1280,
    frameRate: 30,
    sampleRate: 44100,
    duration: 92939.5,
    background: '#000000',
  },
  metadata: {
    createdAt: '2026-01-03T04:25:52.647Z',
    updatedAt: '2026-01-03T04:25:52.647Z',
  },
  tracks: [],
  assets: [],
};

export default function VideoEditorPage() {
  return (
    <StudioProvider initialProject={mock}>
      <StudioApp />
    </StudioProvider>
  );
}
