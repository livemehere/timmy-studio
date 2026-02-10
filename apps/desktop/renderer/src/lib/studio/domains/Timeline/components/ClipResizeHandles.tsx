import { cn } from '@/lib/utils';

type DragMode = 'move' | 'resize-start' | 'resize-end' | null;

const HANDLE_STYLES = {
  base: 'absolute top-0 bottom-0 w-2 cursor-ew-resize transition-colors',
  hover: 'bg-white/40',
  default: 'bg-white/0 group-hover:bg-white/20',
};

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
          HANDLE_STYLES.base,
          'left-0',
          hoverEdge === 'start' || dragMode === 'resize-start'
            ? HANDLE_STYLES.hover
            : HANDLE_STYLES.default
        )}
      />
      <div
        className={cn(
          HANDLE_STYLES.base,
          'right-0',
          hoverEdge === 'end' || dragMode === 'resize-end'
            ? HANDLE_STYLES.hover
            : HANDLE_STYLES.default
        )}
      />
    </>
  );
}
