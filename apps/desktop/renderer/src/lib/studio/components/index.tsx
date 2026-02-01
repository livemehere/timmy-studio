import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { PreviewPanel } from '@/lib/studio/components/Layout/PreviewPanel';
import { PropertiesPanel } from '@/lib/studio/components/Layout/PropertiesPanel';
import { TimelinePanel } from '@/lib/studio/components/Layout/TimelinePanel';
import { ResourcePanel } from '@/lib/studio/components/Layout/ResourcePanel';
import { useAssetUpdateSubscription } from '@/lib/studio/domains/Asset/hooks/useAssetUpdateSubscription';
import { useStudioStores } from '../hooks/useStudioStores';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function StudioApp() {
  useAssetUpdateSubscription();
  const { docStore } = useStudioStores();

  console.log('docsore');

  useEffect(() => {
    const save = () => {
      localStorage.setItem(
        'autosave-doc',
        JSON.stringify(docStore.getState().getProject())
      );
      toast.info('Auto-saved');
    };

    // autosave on any doc change without re-rendering StudioApp
    const unsubscribe = docStore.subscribe(save);
    return unsubscribe;
  }, [docStore]);

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
