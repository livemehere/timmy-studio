import { PreviewRenderer } from '@/lib/studio/components/PreviewRenderer';
import { TimerActionBar } from '@/lib/studio/components/TimerActionBar';

export function PreviewPanel() {
  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* Preview Canvas Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <PreviewRenderer />
        </div>
        {/* Subtle vignette overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.3)_100%)]" />
      </div>

      {/* Controls Bar */}
      <div className="shrink-0 border-t border-neutral-800/50 bg-neutral-900/80 backdrop-blur-sm">
        <TimerActionBar />
      </div>
    </div>
  );
}
