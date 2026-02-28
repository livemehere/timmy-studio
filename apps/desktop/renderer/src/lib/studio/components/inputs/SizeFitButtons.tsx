import {
  Maximize2,
  MoveHorizontal,
  MoveVertical,
  Scaling,
  SquareArrowOutUpRight,
  Undo2,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type SizeFitMode =
  | 'contain'
  | 'cover'
  | 'fitWidth'
  | 'fitHeight'
  | 'stretch'
  | 'original';

interface SizeFitButtonsProps {
  onFit: (mode: SizeFitMode) => void;
  activeMode?: SizeFitMode | null;
}

const FIT_OPTIONS: {
  mode: SizeFitMode;
  label: string;
  description: string;
  icon: typeof Maximize2;
}[] = [
  {
    mode: 'contain',
    label: 'Contain',
    description: '비율 유지, 캔버스 안에 맞춤',
    icon: Scaling,
  },
  {
    mode: 'cover',
    label: 'Cover',
    description: '비율 유지, 캔버스를 꽉 채움',
    icon: SquareArrowOutUpRight,
  },
  {
    mode: 'fitWidth',
    label: 'Fit Width',
    description: '가로에 맞춤 (비율 유지)',
    icon: MoveHorizontal,
  },
  {
    mode: 'fitHeight',
    label: 'Fit Height',
    description: '세로에 맞춤 (비율 유지)',
    icon: MoveVertical,
  },
  {
    mode: 'stretch',
    label: 'Stretch',
    description: '캔버스에 늘려서 꽉 채움',
    icon: Maximize2,
  },
  {
    mode: 'original',
    label: 'Original',
    description: '원본 사이즈로 되돌리기',
    icon: Undo2,
  },
];

export function SizeFitButtons({ onFit, activeMode }: SizeFitButtonsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {FIT_OPTIONS.map(({ mode, label, description, icon: Icon }) => {
        const isActive = activeMode === mode;
        return (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
                  'hover:bg-neutral-700',
                  isActive
                    ? 'bg-neutral-700 text-blue-400'
                    : 'bg-neutral-900 text-neutral-400'
                )}
                onClick={() => onFit(mode)}
              >
                <Icon size={12} />
                {label}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {description}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
