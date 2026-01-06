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
  tracks: [
    {
      id: 'track-1',
      name: 'Graphic Track 1',
      type: 'graphic',
      enabled: true,
      locked: false,
      zIndex: 0,
      opacity: 1,
      clips: [],
    },
  ],
  assets: [
    {
      id: '9fa162fd',
      name: '추어탕.jpeg',
      filePath: '/path/to/sample-media.jpeg',
      metadata: {
        size: 2248902,
        durationMs: 40,
        createdAt: '2025-08-17T04:19:20.143Z',
        width: 2607,
        height: 2908,
        codec: 'mjpeg',
        frameRate: 25,
      },
      type: 'image',
      thumbnailPath: '/path/to/sample-media.jpeg',
    },
  ],
};

export default function VideoEditorPage() {
  return (
    <StudioProvider initialProject={mock}>
      <StudioApp />
    </StudioProvider>
  );
}
