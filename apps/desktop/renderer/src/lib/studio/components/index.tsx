import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { PreviewPanel } from '@/lib/studio/components/Layout/PreviewPanel';
import { PropertiesPanel } from '@/lib/studio/components/Layout/PropertiesPanel';
import { TimelinePanel } from '@/lib/studio/components/Layout/TimelinePanel';
import { ResourcePanel } from '@/lib/studio/components/Layout/ResourcePanel';

export function StudioApp() {
  return (
    <div className="h-full p-2 overflow-hidden">
      <PanelGroup direction={'vertical'}>
        <Panel>
          <PanelGroup direction={'horizontal'}>
            <Panel className={'bg-neutral-900'} defaultSize={30}>
              <ResourcePanel />
            </Panel>
            <PanelResizeHandle className={'w-1 bg-neutral-950'} />
            <Panel className={'bg-neutral-900'}>
              <PreviewPanel />
            </Panel>
            <PanelResizeHandle className={'w-1 bg-neutral-950'} />
            <Panel className={'bg-neutral-900'} defaultSize={25}>
              <PropertiesPanel />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className={'h-1 bg-neutral-950'} />
        <Panel className={'bg-neutral-900'} defaultSize={40}>
          <TimelinePanel />
        </Panel>
      </PanelGroup>
    </div>
  );
}
