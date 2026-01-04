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
      zIndex: 1,
      opacity: 1,
      clips: [
        {
          id: 'bb941ac0',
          name: '기본 텍스트',
          startTime: 0,
          endTime: 3000,
          trimStart: 0,
          trimEnd: 0,
          enabled: true,
          effects: [],
          animations: [],
          zIndex: 0,
          transforms: {
            position: { x: 360, y: 640 },
            size: { width: 150, height: 150 },
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            anchorX: 0,
            anchorY: 0,
          },
          type: 'text',
          textData: {
            content: '기본 텍스트',
            fontSize: 50,
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
          },
        },
      ],
    },
    {
      id: '2bb57977',
      name: 'New Graphic Track',
      zIndex: 0,
      type: 'graphic',
      enabled: true,
      locked: false,
      clips: [
        {
          id: 'bb57977b',
          name: '추어탕.jpeg',
          startTime: 0,
          endTime: 40,
          effects: [],
          animations: [],
          enabled: true,
          trimStart: 0,
          trimEnd: 0,
          transforms: {
            position: { x: 360, y: 200 },
            size: { width: 360, height: 300 },
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            anchorX: 0.5,
            anchorY: 0,
          },
          type: 'image',
          assetId: '9fa162fd',
          zIndex: 0,
        },
      ],
      opacity: 1,
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
