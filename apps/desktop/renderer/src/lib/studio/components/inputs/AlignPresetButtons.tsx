import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  Minus,
  ArrowDown,
} from 'lucide-react';

interface AlignPresetButtonsProps {
  onAlignX: (alignX: 'left' | 'center' | 'right') => void;
  onAlignY: (alignY: 'top' | 'center' | 'bottom') => void;
  currentAlignX?: 'left' | 'center' | 'right';
  currentAlignY?: 'top' | 'center' | 'bottom';
}

export function AlignPresetButtons({
  onAlignX,
  onAlignY,
  currentAlignX = 'center',
  currentAlignY = 'center',
}: AlignPresetButtonsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-neutral-400">Horizontal</div>
      <div className="flex items-center gap-1 bg-neutral-800/50 rounded-lg p-1">
        <button
          onClick={() => onAlignX('left')}
          className={`p-2 rounded-md transition-colors ${
            currentAlignX === 'left'
              ? 'bg-neutral-700 text-white'
              : 'text-neutral-400 hover:text-neutral-300'
          }`}
          title="Left"
        >
          <AlignLeft size={16} />
        </button>
        <button
          onClick={() => onAlignX('center')}
          className={`p-2 rounded-md transition-colors ${
            currentAlignX === 'center'
              ? 'bg-neutral-700 text-white'
              : 'text-neutral-400 hover:text-neutral-300'
          }`}
          title="Center"
        >
          <AlignCenter size={16} />
        </button>
        <button
          onClick={() => onAlignX('right')}
          className={`p-2 rounded-md transition-colors ${
            currentAlignX === 'right'
              ? 'bg-neutral-700 text-white'
              : 'text-neutral-400 hover:text-neutral-300'
          }`}
          title="Right"
        >
          <AlignRight size={16} />
        </button>
      </div>

      <div className="text-xs text-neutral-400 mt-2">Vertical</div>
      <div className="flex items-center gap-1 bg-neutral-800/50 rounded-lg p-1">
        <button
          onClick={() => onAlignY('top')}
          className={`p-2 rounded-md transition-colors ${
            currentAlignY === 'top'
              ? 'bg-neutral-700 text-white'
              : 'text-neutral-400 hover:text-neutral-300'
          }`}
          title="Top"
        >
          <ArrowUp size={16} />
        </button>
        <button
          onClick={() => onAlignY('center')}
          className={`p-2 rounded-md transition-colors ${
            currentAlignY === 'center'
              ? 'bg-neutral-700 text-white'
              : 'text-neutral-400 hover:text-neutral-300'
          }`}
          title="Center"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => onAlignY('bottom')}
          className={`p-2 rounded-md transition-colors ${
            currentAlignY === 'bottom'
              ? 'bg-neutral-700 text-white'
              : 'text-neutral-400 hover:text-neutral-300'
          }`}
          title="Bottom"
        >
          <ArrowDown size={16} />
        </button>
      </div>
    </div>
  );
}
