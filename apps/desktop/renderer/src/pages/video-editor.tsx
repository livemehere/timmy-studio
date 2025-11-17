import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export default function VideoEditorPage() {
  return (
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
  );
}
