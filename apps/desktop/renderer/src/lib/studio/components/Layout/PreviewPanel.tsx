import { PreviewRenderer } from '@renderer/lib/studio/components/PreviewRenderer';
import { TimerActionBar } from '@renderer/lib/studio/components/TimerActionBar';

export function PreviewPanel() {
  return (
    <>
      <PreviewRenderer />
      <TimerActionBar />
    </>
  );
}
