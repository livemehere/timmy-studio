import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { StudioProvider } from '@renderer/lib/studio/contexts/StudioProvider';
import { uid } from 'uid';

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
          width: 1920,
          height: 1080,
          frameRate: 30,
          sampleRate: 44100,
          duration: 1000 * 60,
          backgroundColor: '#000000',
        },
        tracks: [],
      }}
    >
      <div className="h-full p-2 overflow-hidden">
        <PanelGroup direction={'vertical'}>
          <Panel>
            <PanelGroup direction={'horizontal'}>
              <Panel className={'bg-neutral-900'} defaultSize={30}>
                Resources
              </Panel>
              <PanelResizeHandle className={'w-1 bg-neutral-950'} />
              <Panel className={'bg-neutral-900'}>Preview</Panel>
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
