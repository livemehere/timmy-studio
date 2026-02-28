import type { AlignX, AlignY } from '../../domains/Clip/types';
import { cn } from '@/lib/utils';

const COLS: AlignX[] = ['left', 'center', 'right'];
const ROWS: AlignY[] = ['top', 'center', 'bottom'];

interface AlignPresetButtonsProps {
  onAlign: (alignX: AlignX, alignY: AlignY) => void;
  activeAlignX?: AlignX | null;
  activeAlignY?: AlignY | null;
}

export function AlignPresetButtons({
  onAlign,
  activeAlignX,
  activeAlignY,
}: AlignPresetButtonsProps) {
  return (
    <div className="inline-grid grid-cols-3 gap-1 p-2 rounded-lg bg-neutral-900">
      {ROWS.map((row) =>
        COLS.map((col) => {
          const isActive = activeAlignX === col && activeAlignY === row;
          return (
            <button
              key={`${col}-${row}`}
              type="button"
              className={cn(
                'w-7 h-7 rounded flex items-center justify-center transition-colors',
                'hover:bg-neutral-700',
                isActive ? 'bg-neutral-700' : 'bg-transparent'
              )}
              title={`${row} ${col}`}
              onClick={() => onAlign(col, row)}
            >
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isActive ? 'bg-blue-400' : 'bg-neutral-500'
                )}
              />
            </button>
          );
        })
      )}
    </div>
  );
}
