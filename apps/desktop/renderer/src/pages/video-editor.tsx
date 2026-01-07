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
      clips: [
        {
          id: '9f8aa609',
          name: '305657_small.mp4',
          startTime: 0,
          endTime: 14200,
          effects: [],
          animations: [],
          enabled: true,
          trimStart: 0,
          trimEnd: 0,
          transforms: {
            position: { x: 0, y: 437.5 },
            size: { width: 720, height: 405 },
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            anchorX: 0,
            anchorY: 0,
          },
          type: 'video',
          assetId: 'f0fd6a65',
          zIndex: 0,
        },
      ],
    },
    {
      id: 'f19f8aa6',
      name: 'New Audio Track',
      zIndex: -1,
      type: 'audio',
      enabled: true,
      locked: false,
      clips: [
        {
          id: '19f8aa60',
          name: 'super.mp3',
          startTime: 0,
          endTime: 82221,
          effects: [],
          animations: [],
          enabled: true,
          trimStart: 0,
          trimEnd: 0,
          type: 'audio',
          assetId: 'ef0fd6a6',
          volume: 1,
        },
      ],
      volume: 1,
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
    {
      id: 'ef0fd6a6',
      name: 'super.mp3',
      filePath: '/path/to/sample-media.mp3',
      metadata: {
        size: 1407237,
        durationMs: 82221,
        createdAt: '2025-09-13T20:18:16.864Z',
        codec: 'opus',
      },
      type: 'audio',
    },
    {
      id: 'f0fd6a65',
      name: '305657_small.mp4',
      filePath: '/path/to/sample-media.mp4',
      metadata: {
        size: 53254184,
        durationMs: 14200,
        createdAt: '2025-11-02T13:47:16.181Z',
        width: 1920,
        height: 1080,
        codec: 'h264',
        frameRate: 30,
      },
      type: 'video',
      thumbnailPath:
        '/path/to/sample-media.jpg',
      proxyFilePath:
        '/path/to/sample-media.mp4',
      isProxyReady: true,
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
