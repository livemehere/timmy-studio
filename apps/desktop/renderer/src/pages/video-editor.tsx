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
            id: '78286a02-c72b-4f18-b786-b3593414ddd2',
            name: '스포애니.mp4',
            filePath: '/path/to/sample-media.mp4',
            type: 'video',
            thumbnailPath:
              '/path/to/sample-media.jpg',
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
        tracks: [
          // {
          //   id: 'video-track-1',
          //   name: 'Video Track 1',
          //   type: 'video',
          //   enabled: true,
          //   locked: false,
          //   zIndex: 0,
          //   opacity: 1,
          //   clips: [
          //     {
          //       id: uid(4),
          //       name: 'Video1',
          //       type: 'video',
          //       startTime: 0,
          //       endTime: 30000,
          //       assetId: 'sample-video-asset',
          //       transforms: {
          //         position: { x: 0, y: 0 },
          //         size: {
          //           width: 540,
          //           height: 960,
          //         },
          //       },
          //     },
          //     {
          //       id: 'rect',
          //       name: 'Rectangle Shape',
          //       type: 'shape',
          //       startTime: 31000,
          //       endTime: 40000,
          //       transforms: {
          //         position: { x: 100, y: 100 },
          //         size: { width: 400, height: 300 },
          //         rotation: 0,
          //       },
          //       shapeData: {
          //         shapeType: 'rectangle',
          //         width: 100,
          //         height: 100,
          //         color: 'red',
          //       },
          //     },
          //   ],
          // },
        ],
      }}
    >
      <StudioApp />
    </StudioProvider>
  );
}
