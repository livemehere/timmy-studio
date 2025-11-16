import { useState } from 'react';
import type { IProject } from '@renderer/lib/studio/types';
import { uid } from 'uid';
import { StudioProvider } from '@renderer/lib/studio/contexts/StudioProvider';
import { PreviewRenderer } from '@renderer/lib/studio/components/PreviewRenderer';
import { Updater } from '@renderer/lib/studio/components/Updater';

function createInitialProject(): IProject {
  return {
    id: uid(4),
    name: 'sample project',
    assets: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'user',
      description: 'A sample project',
    },
    settings: {
      width: 1920,
      height: 1080,
      frameRate: 30,
      sampleRate: 44100,
      duration: 1000 * 10,
      backgroundColor: '#000000',
    },
    tracks: [
      {
        id: uid(4),
        name: 'Video Track 1',
        type: 'video',
        enabled: true,
        locked: false,
        zIndex: 0,
        opacity: 1,
        clips: [
          {
            id: uid(4),
            name: 'Rectangle',
            type: 'shape',
            startTime: 0,
            endTime: 3000,
            transforms: {
              position: {
                x: 300,
                y: 100,
              },
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              opacity: 1,
            },
            shapeData: {
              shapeType: 'rectangle',
              width: 200,
              height: 150,
              color: 'dodgerblue',
              border: {
                width: 2,
                color: 'white',
              },
            },
          },
        ],
      },
    ],
  };
}

export default function VideoPlayerPage() {
  // const [path, setPath] = useState<string>(
  //   'source://open?path=%2FUsers%2Fdeveloper%2FDownloads%2Fgood-2.mp4'
  // );

  const [project, setProject] = useState<IProject>(() =>
    createInitialProject()
  );

  return (
    <StudioProvider initialProject={project}>
      <div>
        <PreviewRenderer />
        <Updater />
        <button
          onClick={() => {
            setProject(() => createInitialProject());
          }}
        >
          reset
        </button>
      </div>
    </StudioProvider>
  );
}
