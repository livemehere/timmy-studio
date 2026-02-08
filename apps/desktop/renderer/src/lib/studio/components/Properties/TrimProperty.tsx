import { RtNumberInput } from '@/lib/motion-input';
import { ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';

interface TrimPropertyProps {
  trimStart: number;
  trimEnd: number;
  maxTrimMs: number;
  onChangeTrimStart: (value: number) => void;
  onChangeTrimEnd: (value: number) => void;
  onChanged?: () => void;
  onInteractionStart?: () => void;
}

export function TrimProperty({
  trimStart,
  trimEnd,
  maxTrimMs,
  onChangeTrimStart,
  onChangeTrimEnd,
  onChanged,
  onInteractionStart,
}: TrimPropertyProps) {
  const clampTrim = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(value, max));
  const maxTrimStart = Math.max(0, maxTrimMs - trimEnd);
  const maxTrimEnd = Math.max(0, maxTrimMs - trimStart);

  const handleTrimStartChange = (value: number) => {
    onChangeTrimStart(clampTrim(value, 0, maxTrimStart));
    onChanged?.();
  };

  const handleTrimEndChange = (value: number) => {
    onChangeTrimEnd(clampTrim(value, 0, maxTrimEnd));
    onChanged?.();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <RtNumberInput
          defaultValue={trimStart}
          map={(v) => clampTrim(v, 0, maxTrimStart)}
          onChange={handleTrimStartChange}
          onInteractionStart={onInteractionStart}
          min={0}
          max={maxTrimStart}
          step={100}
          icon={<ArrowLeftToLine size={14} />}
        />
        <RtNumberInput
          defaultValue={trimEnd}
          map={(v) => clampTrim(v, 0, maxTrimEnd)}
          onChange={handleTrimEndChange}
          onInteractionStart={onInteractionStart}
          min={0}
          max={maxTrimEnd}
          step={100}
          icon={<ArrowRightToLine size={14} />}
        />
      </div>
    </div>
  );
}
