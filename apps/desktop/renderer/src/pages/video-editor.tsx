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
            id: '27c56d28',
            name: 'New Graphic Track',
            zIndex: 0,
            type: 'graphic',
            enabled: true,
            locked: false,
            clips: [
              {
                id: '7c56d288',
                name: 'sample-user sample-document.png',
                startTime: 0,
                endTime: 3000,
                effects: [],
                animations: [],
                enabled: true,
                trimStart: 0,
                trimEnd: 0,
                transforms: {
                  position: {
                    x: 0,
                    y: 0.39999999999997726,
                  },
                  size: {
                    width: 720,
                    height: 1279.2,
                  },
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                  opacity: 1,
                  anchorX: 0,
                  anchorY: 0,
                },
                type: 'image',
                assetId: '9b49e893',
                zIndex: 0,
              },
            ],
            opacity: 1,
          },
          {
            id: '6b66cfbe',
            name: 'New Graphic Track',
            zIndex: 0,
            type: 'graphic',
            enabled: true,
            locked: false,
            clips: [
              {
                id: 'b66cfbe3',
                name: '스포애니.mp4',
                startTime: 0,
                endTime: 88027,
                effects: [],
                animations: [],
                enabled: true,
                trimStart: 0,
                trimEnd: 0,
                transforms: {
                  position: {
                    x: 0,
                    y: 837.5,
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
                zIndex: 0,
              },
            ],
            opacity: 1,
          },
          {
            id: 'c6b81a11',
            name: 'New Graphic Track',
            zIndex: 0,
            type: 'graphic',
            enabled: true,
            locked: false,
            clips: [
              {
                id: '6b81a117',
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
                    y: 237.5,
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
                zIndex: 0,
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
          {
            id: '9b49e893',
            name: 'sample-user sample-document.png',
            filePath: '/path/to/sample-media.png',
            metadata: {
              size: 183310,
              createdAt: '2025-06-04T15:18:04.660Z',
              width: 600,
              height: 1066,
              codec: 'png',
              frameRate: 25,
            },
            type: 'image',
            thumbnailPath:
              '/path/to/sample-media.png',
          },
        ],
      }}
    >
      <StudioApp />
    </StudioProvider>
  );
}
