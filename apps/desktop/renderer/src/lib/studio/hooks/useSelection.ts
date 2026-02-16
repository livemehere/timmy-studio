import { useEffect, useRef, useState } from 'react';

type SelectionRange = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

type SelectionTarget = {
  value: string;
  target: HTMLElement;
};

type UseSelectionOptions = {
  target: string;
  onRangeUpdate?: (range: SelectionRange | null) => void;
  onSelectionChange?: (targets: SelectionTarget[]) => void;
};

export function useSelection({
  target,
  onRangeUpdate,
  onSelectionChange,
}: UseSelectionOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const rangeRef = useRef<SelectionRange | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const toRange = (
      startX: number,
      startY: number,
      currentX: number,
      currentY: number
    ): SelectionRange => {
      const minX = Math.min(startX, currentX);
      const maxX = Math.max(startX, currentX);
      const minY = Math.min(startY, currentY);
      const maxY = Math.max(startY, currentY);
      return {
        startX,
        startY,
        currentX,
        currentY,
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const targetEl = (e.target as HTMLElement | null)?.closest(`[${target}]`);
      if (targetEl) return;

      const rect = container.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      isDraggingRef.current = true;
      setIsDragging(true);
      const range = toRange(startX, startY, startX, startY);
      rangeRef.current = range;
      onRangeUpdate?.(range);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !rangeRef.current) return;

      const rect = container.getBoundingClientRect();
      // 마우스 좌표를 containerRef 범위 내로 clamp
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const currentX = Math.max(0, Math.min(rect.width, rawX));
      const currentY = Math.max(0, Math.min(rect.height, rawY));

      const range = toRange(
        rangeRef.current.startX,
        rangeRef.current.startY,
        currentX,
        currentY
      );
      rangeRef.current = range;
      onRangeUpdate?.(range);
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;

      const range = rangeRef.current;
      if (!range) {
        isDraggingRef.current = false;
        onRangeUpdate?.(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const selectionBounds = {
        left: containerRect.left + range.minX,
        right: containerRect.left + range.maxX,
        top: containerRect.top + range.minY,
        bottom: containerRect.top + range.maxY,
      };

      const clipElements = container.querySelectorAll(`[${target}]`);
      const selectedTargets: SelectionTarget[] = [];

      clipElements.forEach((node) => {
        const element = node as HTMLElement;
        const value = element.getAttribute(target);
        if (!value) return;

        const rect = element.getBoundingClientRect();
        const isOverlapping = !(
          rect.right < selectionBounds.left ||
          rect.left > selectionBounds.right ||
          rect.bottom < selectionBounds.top ||
          rect.top > selectionBounds.bottom
        );

        if (isOverlapping) {
          selectedTargets.push({ value, target: element });
        }
      });

      onSelectionChange?.(selectedTargets);

      isDraggingRef.current = false;
      setIsDragging(false);
      rangeRef.current = null;
      onRangeUpdate?.(null);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onRangeUpdate, onSelectionChange, target]);

  return { ref: containerRef, isDragging } as const;
}
