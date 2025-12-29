import { StudioProvider } from '@renderer/lib/studio/contexts/StudioProvider';
import { uid } from 'uid';
import { StudioApp } from '@renderer/lib/studio/components';

export default function VideoEditorPage() {
  return (
    <StudioProvider
      initialProject={{
        id: uid(4),
        name: 'sample project',
        assets: [
          {
            id: 'f87687d2-ff86-4588-a9f7-f5b595ff7384',
            name: '스포애니.mp4',
            filePath: '/path/to/sample-media.mp4',
            type: 'video',
            thumbnailPath:
              '/path/to/sample-media.jpg',
            proxyFilePath:
              '/path/to/sample-media.mp4',
            isProxyReady: true,
            metadata: {
              width: 640,
              height: 360,
              codec: 'h264',
              size: 6138051,
              durationMs: 88027,
              frameRate: 23.976023976023978,
              createdAt: '2025-05-12T02:13:10.000000Z',
            },
          },
        ],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        settings: {
          // width: 1920,
          // height: 1080,
          // 새로형
          width: 720,
          height: 1280,
          frameRate: 30,
          sampleRate: 44100,
          duration: 1000 * 60,
          background: '#000000',
        },
        tracks: [],
      }}
    >
      <StudioApp />
    </StudioProvider>
  );
}
