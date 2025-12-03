import { StudioProvider } from '@renderer/lib/studio/contexts/StudioProvider';
import { uid } from 'uid';
import { StudioApp } from '@renderer/lib/studio/components/StudioApp';

export default function VideoEditorPage() {
  return (
    <StudioProvider
      initialProject={{
        id: uid(4),
        name: 'sample project',
        assets: [
          {
            id: 'sample-video-asset',
            name: 'Sample Video',
            type: 'video',
            filePath: 'file:///path/to/sample-media.MOV',
            proxyFilePath: 'file:///path/to/sample-media.mp4',
            metadata: {
              size: 1000,
              createdAt: new Date().toISOString(),
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
        tracks: [
          {
            id: 'video-track-1',
            name: 'Video Track 1',
            type: 'video',
            enabled: true,
            locked: false,
            zIndex: 0,
            opacity: 1,
            clips: [
              {
                id: uid(4),
                name: 'Video1',
                type: 'video',
                startTime: 0,
                endTime: 30000,
                assetId: 'sample-video-asset',
                transforms: {
                  position: { x: 0, y: 0 },
                  size: {
                    width: 540,
                    height: 960,
                  },
                },
              },
              {
                id: 'rect',
                name: 'Rectangle Shape',
                type: 'shape',
                startTime: 31000,
                endTime: 40000,
                transforms: {
                  position: { x: 100, y: 100 },
                  size: { width: 400, height: 300 },
                  rotation: 0,
                },
                shapeData: {
                  shapeType: 'rectangle',
                  width: 100,
                  height: 100,
                  color: 'red',
                },
              },
            ],
          },
        ],
      }}
    >
      <StudioApp />
    </StudioProvider>
  );
}
