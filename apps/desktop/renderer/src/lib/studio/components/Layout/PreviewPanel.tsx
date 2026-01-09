import { PreviewRenderer } from '@/lib/studio/components/PreviewRenderer';
import { TimerActionBar } from '@/lib/studio/components/TimerActionBar';

export function PreviewPanel() {
  return (
    <>
      <PreviewRenderer />
      <TimerActionBar />
    </>
  );
}
