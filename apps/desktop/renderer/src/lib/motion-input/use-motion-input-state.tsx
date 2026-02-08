import { motion, useMotionValueEvent } from 'motion/react';
import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface BaseMotionInputProps {
  onInteractionStart?: () => void;
  onLiveChange?: (v: any) => void;
  onCommit?: (v: any) => void;
  onCancel?: () => void;
}

export function useMotionInputState<T extends string | number>({
  value,
  onChange,
  onLiveChange,
  onCommit,
  onInteractionStart,
  onCancel,
}: {
  value: T;
  onChange?: (v: T) => void;
  onLiveChange?: (v: T) => void;
  onCommit?: (v: T) => void;
  onInteractionStart?: () => void;
  onCancel?: () => void;
}) {
  const inputValueBuffer = useRef('');
  const [isFocused, setIsFocused] = useState(false);
  const isDraggingRef = useRef(false);

  const handleFocus = () => {
    setIsFocused(true);
    onInteractionStart?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onCommit?.(inputValueBuffer.current as T);
    inputValueBuffer.current = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit?.(inputValueBuffer.current as T);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    inputValueBuffer.current = e.target.value;
    onLiveChange?.(e.target.value as T);
  };

  return {
    isFocused,
    isDraggingRef,
    handleFocus,
    handleBlur,
    handleKeyDown,
    handleChange,
  };
}
