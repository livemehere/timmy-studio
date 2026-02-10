import { cn } from '@/lib/utils';

const HANDLE_STYLES = {
  base: 'absolute top-0 bottom-0 w-2 cursor-ew-resize transition-colors hover:cursor-ew-resize group-hover:bg-white/40',
};

export function ClipResizeHandles() {
  return (
    <>
      <div
        data-resize-handle="start"
        className={cn(HANDLE_STYLES.base, 'left-0')}
      />
      <div
        data-resize-handle="end"
        className={cn(HANDLE_STYLES.base, 'right-0')}
      />
    </>
  );
}
