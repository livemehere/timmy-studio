import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { PreviewPanel } from '@/lib/studio/components/Panels/PreviewPanel';
import { PropertiesPanel } from '@/lib/studio/components/Panels/PropertiesPanel';
import { TimelinePanel } from '@/lib/studio/components/Panels/TimelinePanel';
import { ResourcePanel } from '@/lib/studio/components/Panels/ResourcePanel';

export function StudioApp() {
  return (
    <div className="h-full overflow-hidden">
      <PanelGroup direction={'vertical'}>
        <Panel>
          <PanelGroup direction={'horizontal'}>
            <Panel defaultSize={30}>
              <ResourcePanel />
            </Panel>
            <PanelResizeHandle className={'w-1 bg-black'} />
            <Panel>
              <PreviewPanel />
            </Panel>
            <PanelResizeHandle className={'w-1 bg-black'} />
            <Panel defaultSize={25}>
              <PropertiesPanel />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className={'h-1 bg-black'} />
        <Panel defaultSize={40}>
          <TimelinePanel />
        </Panel>
      </PanelGroup>
    </div>
  );
}
