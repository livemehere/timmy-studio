import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  Minus,
  ArrowDown,
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-neutral-400 text-xs">Horizontal</Label>
        <ToggleGroup
          type="single"
          value={currentAlignX}
          onValueChange={(v) => v && onAlignX(v as 'left' | 'center' | 'right')}
          variant="outline"
          size="sm"
          className="justify-start"
        >
          <ToggleGroupItem value="left" aria-label="Left align">
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Center align">
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Right align">
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-neutral-400 text-xs">Vertical</Label>
        <ToggleGroup
          type="single"
          value={currentAlignY}
          onValueChange={(v) => v && onAlignY(v as 'top' | 'center' | 'bottom')}
          variant="outline"
          size="sm"
          className="justify-start"
        >
          <ToggleGroupItem value="top" aria-label="Top align">
            <ArrowUp className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Center align">
            <Minus className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="bottom" aria-label="Bottom align">
            <ArrowDown className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
