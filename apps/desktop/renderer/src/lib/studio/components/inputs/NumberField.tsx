import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, useCallback } from 'react';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** 🔥 드래그 중 실시간 미리보기용 - store 거치지 않고 직접 clip에 적용 */
  onLiveChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showRange?: boolean;
  unit?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  onLiveChange,
  min = 0,
  max = 100,
  step = 1,
  showRange = false,
  unit,
}: NumberFieldProps) {
  // 로컬 상태 - 드래그 중 UI 업데이트
  const [localValue, setLocalValue] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingValueRef = useRef<number | null>(null);

  // 외부 value가 변경되면 로컬 상태 리셋
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(null);
    }
  }, [value]);

  // cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // rAF throttle: 프레임당 1회만 onChange 호출
  const scheduleChange = useCallback(
    (v: number) => {
      pendingValueRef.current = v;
      if (rafRef.current) return; // 이미 예약됨
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const val = pendingValueRef.current;
        if (val !== null) {
          if (onLiveChange) {
            onLiveChange(val);
          } else {
            onChange(val);
          }
        }
      });
    },
    [onChange, onLiveChange]
  );

  // 표시할 값: 드래그 중이면 로컬 값, 아니면 store 값
  const displayValue = localValue ?? value;
  const formattedValue =
    step < 1 ? displayValue.toFixed(2) : displayValue.toString();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <Label className="text-neutral-400 w-24 shrink-0 text-sm">
          {label}
        </Label>
        <div className="flex-1 flex items-center gap-2">
          <Input
            type="number"
            value={displayValue}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            min={min}
            max={max}
            step={step}
            className={cn(
              'flex-1 h-8 bg-neutral-800/50 border-neutral-700',
              'focus-visible:border-neutral-500 focus-visible:ring-0',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
            )}
          />
          {unit && (
            <span className="text-xs text-neutral-500 shrink-0">{unit}</span>
          )}
        </div>
      </div>
      {showRange && (
        <div className="ml-[108px] flex items-center gap-2">
          <Slider
            value={[displayValue]}
            onValueChange={([v]) => {
              isDraggingRef.current = true;
              setLocalValue(v);
              // 🔥 rAF throttle — 프레임당 1회만 엔진 업데이트
              scheduleChange(v);
            }}
            onValueCommit={([v]) => {
              // 🔥 드래그 끝날 때 store에 커밋
              isDraggingRef.current = false;
              setLocalValue(null);
              onChange(v);
            }}
            min={min}
            max={max}
            step={step}
            className="flex-1"
          />
          <span className="text-[10px] text-neutral-500 w-10 text-right font-mono">
            {formattedValue}
          </span>
        </div>
      )}
    </div>
  );
}
