import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { StudioProvider } from '@renderer/lib/studio/contexts/StudioProvider';
import { uid } from 'uid';
import { PreviewRenderer } from '@renderer/lib/studio/components/PreviewRenderer';
import { StudioDebugger } from '@renderer/lib/studio/components/StduioDebugger';
import { TimelineTracks } from '@renderer/lib/studio/components/Timeline/TimelineTracks';
import { ActionBar } from '@renderer/lib/studio/components/ActionBar';
import { TimelineRulerCanvas } from '@renderer/lib/studio/components/TimelineRulerCanvas';
import { TimerActionBar } from '@renderer/lib/studio/components/TimerActionBar';
import { useRef } from 'react';
import { useScroll } from 'motion/react';

export default function VideoEditorPage() {
  const totalTrackWidth = 1200;
  const totalTrackHeight = 2200;

  const trackTitleWidth = 120;
  const trackHeight = 60;

  const pxPerSec = 10;

  const hScrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollX } = useScroll({
    container: hScrollContainerRef,
  });

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
                <TimerActionBar />
              </Panel>
              <PanelResizeHandle className={'w-1 bg-neutral-950'} />
              <Panel className={'bg-neutral-900'} defaultSize={25}>
                Properties
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle className={'h-1 bg-neutral-950'} />
          <Panel className={'bg-neutral-900'} defaultSize={40}>
            <div className={'relative h-full overflow-y-scroll'}>
              <div className={'sticky top-0 z-30 bg-neutral-900'}>
                <ActionBar />
                <TimelineRulerCanvas
                  leftPadding={trackTitleWidth}
                  scrollXMotionValue={scrollX}
                />
              </div>

              <div
                ref={hScrollContainerRef}
                className={'w-full overflow-x-scroll'}
              >
                <TimelineTracks
                  width={totalTrackWidth}
                  height={totalTrackHeight}
                  trackTitleWidth={trackTitleWidth}
                  trackHeight={trackHeight}
                  pxPerSec={pxPerSec}
                />
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </StudioProvider>
  );
}
