import { StudioProvider } from '@renderer/lib/studio/contexts/StudioProvider';
import { StudioApp } from '@renderer/lib/studio/components';

export default function VideoEditorPage() {
  return (
    <StudioProvider
      initialProject={{
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
            id: '0e04a7e4',
            name: 'New Video Track',
            zIndex: 0,
            type: 'graphic',
            enabled: true,
            locked: false,
            clips: [
              {
                id: 'e04a7e4f',
                name: '스포애니.mp4',
                startTime: 4912.5,
                endTime: 92939.5,
                effects: [],
                animations: [],
                enabled: true,
                trimStart: 0,
                trimEnd: 0,
                transforms: {
                  position: {
                    x: 100,
                    y: 737.5,
                  },
                  size: {
                    width: 720,
                    height: 405,
                  },
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                  opacity: 1,
                  anchorX: 0,
                  anchorY: 0,
                },
                type: 'video',
                assetId: '2f00907e',
              },
            ],
            opacity: 1,
          },
          {
            id: '0f096654',
            name: 'New Video Track',
            zIndex: 0,
            type: 'graphic',
            enabled: true,
            locked: false,
            clips: [
              {
                id: 'f0966541',
                name: '305657_small.mp4',
                startTime: 0,
                endTime: 14200,
                effects: [],
                animations: [],
                enabled: true,
                trimStart: 0,
                trimEnd: 0,
                transforms: {
                  position: {
                    x: 0,
                    y: 437.5,
                  },
                  size: {
                    width: 720,
                    height: 405,
                  },
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                  opacity: 1,
                  anchorX: 0,
                  anchorY: 0,
                },
                type: 'video',
                assetId: '5f330a0a',
              },
            ],
            opacity: 1,
          },
        ],
        assets: [
          {
            id: '2f00907e',
            name: '스포애니.mp4',
            filePath: '/path/to/sample-media.mp4',
            metadata: {
              size: 6138051,
              durationMs: 88027,
              createdAt: '2025-05-12T02:13:10.000000Z',
              width: 640,
              height: 360,
              codec: 'h264',
              frameRate: 23.976023976023978,
            },
            type: 'video',
            thumbnailPath:
              '/path/to/sample-media.jpg',
            proxyFilePath:
              '/path/to/sample-media.mp4',
            isProxyReady: true,
          },
          {
            id: '5f330a0a',
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
      }}
    >
      <StudioApp />
    </StudioProvider>
  );
}
