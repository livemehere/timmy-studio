import { MotionNumberInput } from '@/lib/motion-input';
import { ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';
import { useMotionValue, useMotionValueEvent } from 'motion/react';

interface TrimPropertyProps {
  trimStart: number;
  trimEnd: number;
  maxTrimMs: number;
  onChangeTrimStart: (value: number) => void;
  onChangeTrimEnd: (value: number) => void;
  onChanged?: () => void;
}

export function TrimProperty({
  trimStart,
  trimEnd,
  maxTrimMs,
  onChangeTrimStart,
  onChangeTrimEnd,
  onChanged,
}: TrimPropertyProps) {
  const trimStartValue = useMotionValue(trimStart);
  const trimEndValue = useMotionValue(trimEnd);

  const clampTrim = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(value, max));
  const maxTrimStart = Math.max(0, maxTrimMs - trimEnd);
  const maxTrimEnd = Math.max(0, maxTrimMs - trimStart);

  useMotionValueEvent(trimStartValue, 'change', (value) => {
    onChangeTrimStart(clampTrim(value, 0, maxTrimStart));
    onChanged?.();
  });

  useMotionValueEvent(trimEndValue, 'change', (value) => {
    onChangeTrimEnd(clampTrim(value, 0, maxTrimEnd));
    onChanged?.();
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <MotionNumberInput
          value={trimStartValue}
          map={(v) => clampTrim(v, 0, maxTrimStart)}
          min={0}
          max={maxTrimStart}
          step={100}
          icon={<ArrowLeftToLine size={14} />}
          onCommit={(value) => {
            onChangeTrimStart(clampTrim(value, 0, maxTrimStart));
            onChanged?.();
          }}
        />
        <MotionNumberInput
          value={trimEndValue}
          map={(v) => clampTrim(v, 0, maxTrimEnd)}
          min={0}
          max={maxTrimEnd}
          step={100}
          icon={<ArrowRightToLine size={14} />}
          onCommit={(value) => {
            onChangeTrimEnd(clampTrim(value, 0, maxTrimEnd));
            onChanged?.();
          }}
        />
      </div>
    </div>
  );
}
