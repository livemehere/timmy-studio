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
          // Rectangle - appears first (0-3s)
          {
            id: uid(4),
            name: 'Rectangle',
            type: 'shape',
            startTime: 0,
            endTime: 3000,
            transforms: {
              position: {
                x: 200,
                y: 200,
              },
              scaleX: 1.5,
              scaleY: 2,
              rotation: Math.PI / 4,
              opacity: 0.8,
            },
            shapeData: {
              shapeType: 'rectangle',
              width: 200,
              height: 150,
              color: 0x1e90ff, // dodgerblue
              border: {
                width: 3,
                color: 0xffffff, // white
              },
            },
          },
          // Circle - overlaps with rectangle (2-5s)
          {
            id: uid(4),
            name: 'Circle',
            type: 'shape',
            startTime: 2000,
            endTime: 5000,
            transforms: {
              position: {
                x: 800,
                y: 300,
              },
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              opacity: 0.9,
            },
            shapeData: {
              shapeType: 'circle',
              width: 250,
              height: 250,
              radius: 125,
              color: 0xff6347, // tomato
              border: {
                width: 4,
                color: 0xffff00, // yellow
              },
            },
          },
          // Hexagon - appears after circle starts (4-7s)
          {
            id: uid(4),
            name: 'Hexagon',
            type: 'shape',
            startTime: 4000,
            endTime: 7000,
            transforms: {
              position: {
                x: 500,
                y: 600,
              },
              scaleX: 1.2,
              scaleY: 1.2,
              rotation: Math.PI / 6,
              opacity: 0.85,
            },
            shapeData: {
              shapeType: 'polygon',
              width: 200,
              height: 200,
              color: 0x32cd32, // limegreen
              border: {
                width: 5,
                color: 0x006400, // darkgreen
              },
            },
          },
          // Small Rectangle - bottom right (5-8s)
          {
            id: uid(4),
            name: 'Small Rectangle',
            type: 'shape',
            startTime: 5000,
            endTime: 8000,
            transforms: {
              position: {
                x: 1500,
                y: 800,
              },
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              opacity: 0.7,
            },
            shapeData: {
              shapeType: 'rectangle',
              width: 150,
              height: 100,
              color: 0xff1493, // deeppink
              border: {
                width: 2,
                color: 0x800080, // purple
              },
            },
          },
          // Circle - top left (6-9s)
          {
            id: uid(4),
            name: 'Small Circle',
            type: 'shape',
            startTime: 6000,
            endTime: 9000,
            transforms: {
              position: {
                x: 150,
                y: 150,
              },
              scaleX: 0.8,
              scaleY: 0.8,
              rotation: 0,
              opacity: 0.95,
            },
            shapeData: {
              shapeType: 'circle',
              width: 180,
              height: 180,
              radius: 90,
              color: 0xffa500, // orange
            },
          },
          // Rotated Rectangle - center (7-10s)
          {
            id: uid(4),
            name: 'Rotated Rectangle',
            type: 'shape',
            startTime: 7000,
            endTime: 10000,
            transforms: {
              position: {
                x: 960,
                y: 540,
              },
              scaleX: 2,
              scaleY: 0.5,
              rotation: Math.PI / 3,
              opacity: 0.6,
            },
            shapeData: {
              shapeType: 'rectangle',
              width: 300,
              height: 80,
              color: 0x9370db, // mediumpurple
              border: {
                width: 3,
                color: 0x4b0082, // indigo
              },
            },
          },
          // Text: Title - top center (0-4s)
          {
            id: uid(4),
            name: 'Title Text',
            type: 'text',
            startTime: 0,
            endTime: 4000,
            transforms: {
              position: {
                x: 960,
                y: 100,
              },
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              opacity: 1,
            },
            textData: {
              content: 'Welcome to Timmy Studio!',
              fontSize: 72,
              fontFamily: 'Arial',
              color: 0xffffff, // white
              align: 'center',
              bold: true,
              shadow: {
                color: 0x000000,
                offsetX: 3,
                offsetY: 3,
                blur: 10,
              },
            },
          },
          // Text: Subtitle with background (3-7s)
          {
            id: uid(4),
            name: 'Subtitle Text',
            type: 'text',
            startTime: 3000,
            endTime: 7000,
            transforms: {
              position: {
                x: 1200,
                y: 500,
              },
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              opacity: 0.95,
            },
            textData: {
              content: 'Shape & Text Demo',
              fontSize: 48,
              fontFamily: 'Arial',
              color: 0xffff00, // yellow
              align: 'center',
              bold: true,
              italic: true,
              background: 0x000000, // black
              border: {
                color: 0xffff00, // yellow
                width: 3,
                radius: 10,
              },
              padding: 20,
            },
          },
          // Text: Simple label (5-9s)
          {
            id: uid(4),
            name: 'Label Text',
            type: 'text',
            startTime: 5000,
            endTime: 9000,
            transforms: {
              position: {
                x: 300,
                y: 900,
              },
              scaleX: 1,
              scaleY: 1,
              rotation: -Math.PI / 12,
              opacity: 0.9,
            },
            textData: {
              content: 'Rotating Shapes',
              fontSize: 36,
              fontFamily: 'Arial',
              color: 0x00ffff, // cyan
              align: 'left',
              bold: false,
              italic: true,
            },
          },
          // Text: With underline (6-10s)
          {
            id: uid(4),
            name: 'Underline Text',
            type: 'text',
            startTime: 6000,
            endTime: 10000,
            transforms: {
              position: {
                x: 1600,
                y: 200,
              },
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              opacity: 0.85,
            },
            textData: {
              content: 'Important!',
              fontSize: 42,
              fontFamily: 'Arial',
              color: 0xff0000, // red
              align: 'center',
              bold: true,
              underline: true,
              background: 0xffff00, // yellow
              padding: [10, 20],
            },
          },
          // Text: End message (8-10s)
          {
            id: uid(4),
            name: 'End Text',
            type: 'text',
            startTime: 8000,
            endTime: 10000,
            transforms: {
              position: {
                x: 960,
                y: 900,
              },
              scaleX: 1.2,
              scaleY: 1.2,
              rotation: 0,
              opacity: 1,
            },
            textData: {
              content: 'That\'s All Folks!',
              fontSize: 64,
              fontFamily: 'Arial',
              color: 0xffffff, // white
              align: 'center',
              bold: true,
              italic: true,
              shadow: {
                color: 0xff00ff, // magenta
                offsetX: 4,
                offsetY: 4,
                blur: 15,
              },
              background: 0x000000,
              border: {
                color: 0xff00ff, // magenta
                width: 4,
                radius: 15,
              },
              padding: [15, 30, 15, 30],
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
