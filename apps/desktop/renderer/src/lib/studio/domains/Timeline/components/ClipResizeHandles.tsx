import { cn } from '@/lib/utils';

type DragMode = 'move' | 'resize-start' | 'resize-end' | null;

export function ClipResizeHandles({
  hoverEdge,
  dragMode,
}: {
  hoverEdge: 'start' | 'end' | null;
  dragMode: DragMode;
}) {
  return (
    <>
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-2 transition-colors cursor-ew-resize',
          hoverEdge === 'start' || dragMode === 'resize-start'
            ? 'bg-white/40'
            : 'bg-white/0 group-hover:bg-white/20'
        )}
      />
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-2 transition-colors cursor-ew-resize',
          hoverEdge === 'end' || dragMode === 'resize-end'
            ? 'bg-white/40'
            : 'bg-white/0 group-hover:bg-white/20'
        )}
      />
    </>
  );
}
