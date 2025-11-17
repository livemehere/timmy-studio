import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { StudioProvider } from '@renderer/lib/studio/contexts/StudioProvider';
import { uid } from 'uid';
import { PreviewRenderer } from '@renderer/lib/studio/components/PreviewRenderer';
import { StudioDebugger } from '@renderer/lib/studio/components/StduioDebugger';

export default function VideoEditorPage() {
  return (
    <StudioProvider
      initialProject={{
        id: uid(4),
        name: 'sample project',
        assets: [],
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
                id: 'rect',
                name: 'Rectangle Shape',
                type: 'shape',
                startTime: 0,
                endTime: 10000,
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
      <div className="h-full p-2 overflow-hidden">
        <StudioDebugger />
        <PanelGroup direction={'vertical'}>
          <Panel>
            <PanelGroup direction={'horizontal'}>
              <Panel className={'bg-neutral-900'} defaultSize={30}>
                Resources
              </Panel>
              <PanelResizeHandle className={'w-1 bg-neutral-950'} />
              <Panel className={'bg-neutral-900'}>
                <PreviewRenderer />
              </Panel>
              <PanelResizeHandle className={'w-1 bg-neutral-950'} />
              <Panel className={'bg-neutral-900'} defaultSize={25}>
                Properties
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle className={'h-1 bg-neutral-950'} />
          <Panel className={'bg-neutral-900'} defaultSize={40}>
            Bottom
          </Panel>
        </PanelGroup>
      </div>
    </StudioProvider>
  );
}
