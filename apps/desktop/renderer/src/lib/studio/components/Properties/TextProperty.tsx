import { useState, useRef, useCallback, useEffect } from 'react';
import { TextField, ColorField, NumberField, ToggleField } from '../inputs';
import { TextAreaField } from '../inputs/TextAreaField';
import type { ITextData } from '../../types/text';

const DEBOUNCE_MS = 300;

interface TextPropertyProps {
  textData: ITextData;
  /** debounce 후 store 에 커밋 */
  onChange: (updates: Partial<ITextData>) => void;
  /** 🔥 store 를 거치지 않고 엔진에 직접 실시간 미리보기 적용 */
  onLivePreview?: (merged: ITextData) => void;
  onChanged?: () => void;
}

/**
 * TextProperty — local state + debounced commit 패턴.
 *
 * 모든 입력은 먼저 local state 에만 반영하고 엔진에 live preview 전송.
 * DEBOUNCE_MS 동안 추가 입력이 없으면 store 에 커밋하여
 * Immer produce → syncTracks → renderOnce 파이프라인을 최소 빈도로 호출.
 */
export function TextProperty({
  textData,
  onChange,
  onLivePreview,
  onChanged,
}: TextPropertyProps) {
  // ── local state: store 와 독립된 작업 복사본 ──
  const [local, setLocal] = useState<ITextData>(textData);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestLocal = useRef<ITextData>(local);

  // store 에서 외부 변경이 오면 로컬 동기화 (다른 곳에서 수정된 경우)
  // debounce 진행 중이 아닐 때만 외부값 수용
  const isPendingCommit = useRef(false);
  useEffect(() => {
    if (!isPendingCommit.current) {
      setLocal(textData);
      latestLocal.current = textData;
    }
  }, [textData]);

  // commit: debounce timer 가 만료될 때 호출
  const commitToStore = useCallback(() => {
    isPendingCommit.current = false;
    onChange(latestLocal.current);
    onChanged?.();
  }, [onChange, onChanged]);

  // 핵심: 로컬 업데이트 + live preview + debounce commit
  const handleChange = useCallback(
    (updates: Partial<ITextData>) => {
      setLocal((prev) => {
        const merged = { ...prev, ...updates };
        latestLocal.current = merged;

        // 엔진에 직접 실시간 미리보기
        onLivePreview?.(merged);

        return merged;
      });

      // debounce 재시작
      isPendingCommit.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(commitToStore, DEBOUNCE_MS);
    },
    [onLivePreview, commitToStore]
  );

  // unmount 시 pending commit flush
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // unmount 시점의 최신 로컬 값을 커밋
        if (isPendingCommit.current) {
          onChange(latestLocal.current);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <TextAreaField
        label="Content"
        value={local.content}
        onChange={(value) => handleChange({ content: value })}
      />

      <TextField
        label="Font Family"
        defaultValue={local.fontFamily}
        onChange={(value) => handleChange({ fontFamily: value })}
        onCommit={(value) => handleChange({ fontFamily: value })}
      />

      <NumberField
        label="Font Size"
        value={local.fontSize}
        onChange={(value) => handleChange({ fontSize: value })}
        min={8}
        max={200}
        showRange
      />

      <ColorField
        label="Color"
        value={String(local.color)}
        onChange={(value) => handleChange({ color: value })}
      />

      <div className="flex flex-col gap-2 mt-2">
        <div className="text-xs text-neutral-400 mb-1">Alignment</div>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => handleChange({ align })}
              className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors ${
                local.align === align
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              }`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <div className="text-xs text-neutral-400 mb-1">Text Style</div>
        <ToggleField
          label="Bold"
          checked={local.bold ?? false}
          onChange={(checked) => handleChange({ bold: checked })}
        />
        <ToggleField
          label="Italic"
          checked={local.italic ?? false}
          onChange={(checked) => handleChange({ italic: checked })}
        />
        <ToggleField
          label="Underline"
          checked={local.underline ?? false}
          onChange={(checked) => handleChange({ underline: checked })}
        />
      </div>

      <NumberField
        label="Letter Spacing"
        value={local.letterSpacing ?? 0}
        onChange={(value) => handleChange({ letterSpacing: value })}
        min={-10}
        max={50}
        step={0.5}
      />

      <NumberField
        label="Line Height"
        value={local.lineHeight ?? 1}
        onChange={(value) => handleChange({ lineHeight: value })}
        min={0.5}
        max={3}
        step={0.1}
      />

      <div className="flex flex-col gap-2 mt-4">
        <div className="text-xs text-neutral-400 mb-1">Background</div>
        <ToggleField
          label="Enable"
          checked={!!local.background}
          onChange={(checked) => {
            if (checked) {
              handleChange({
                background: {
                  color: '#000000',
                  paddingX: 10,
                  paddingY: 10,
                  radius: 0,
                  alpha: 1,
                },
              });
            } else {
              handleChange({ background: undefined });
            }
          }}
        />
        {local.background && (
          <>
            <ColorField
              label="Color"
              value={local.background.color}
              onChange={(value) =>
                handleChange({
                  background: { ...local.background!, color: value },
                })
              }
            />
            <NumberField
              label="Padding X"
              value={local.background.paddingX}
              onChange={(value) =>
                handleChange({
                  background: { ...local.background!, paddingX: value },
                })
              }
              min={0}
              max={100}
            />
            <NumberField
              label="Padding Y"
              value={local.background.paddingY}
              onChange={(value) =>
                handleChange({
                  background: { ...local.background!, paddingY: value },
                })
              }
              min={0}
              max={100}
            />
            <NumberField
              label="Radius"
              value={local.background.radius}
              onChange={(value) =>
                handleChange({
                  background: { ...local.background!, radius: value },
                })
              }
              min={0}
              max={50}
            />
            <NumberField
              label="Alpha"
              value={local.background.alpha ?? 1}
              onChange={(value) =>
                handleChange({
                  background: { ...local.background!, alpha: value },
                })
              }
              min={0}
              max={1}
              step={0.1}
              showRange
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <div className="text-xs text-neutral-400 mb-1">Shadow</div>
        <ToggleField
          label="Enable"
          checked={!!local.shadow}
          onChange={(checked) => {
            if (checked) {
              handleChange({
                shadow: {
                  color: '#000000',
                  blur: 4,
                  offsetX: 2,
                  offsetY: 2,
                  alpha: 0.5,
                },
              });
            } else {
              handleChange({ shadow: undefined });
            }
          }}
        />
        {local.shadow && (
          <>
            <ColorField
              label="Color"
              value={local.shadow.color}
              onChange={(value) =>
                handleChange({
                  shadow: { ...local.shadow!, color: value },
                })
              }
            />
            <NumberField
              label="Blur"
              value={local.shadow.blur}
              onChange={(value) =>
                handleChange({
                  shadow: { ...local.shadow!, blur: value },
                })
              }
              min={0}
              max={50}
            />
            <NumberField
              label="Offset X"
              value={local.shadow.offsetX}
              onChange={(value) =>
                handleChange({
                  shadow: { ...local.shadow!, offsetX: value },
                })
              }
              min={-50}
              max={50}
            />
            <NumberField
              label="Offset Y"
              value={local.shadow.offsetY}
              onChange={(value) =>
                handleChange({
                  shadow: { ...local.shadow!, offsetY: value },
                })
              }
              min={-50}
              max={50}
            />
            <NumberField
              label="Alpha"
              value={local.shadow.alpha ?? 1}
              onChange={(value) =>
                handleChange({
                  shadow: { ...local.shadow!, alpha: value },
                })
              }
              min={0}
              max={1}
              step={0.1}
              showRange
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <div className="text-xs text-neutral-400 mb-1">Border</div>
        <ToggleField
          label="Enable"
          checked={!!local.border}
          onChange={(checked) => {
            if (checked) {
              handleChange({
                border: {
                  color: '#ffffff',
                  width: 1,
                  radius: 0,
                },
              });
            } else {
              handleChange({ border: undefined });
            }
          }}
        />
        {local.border && (
          <>
            <ColorField
              label="Color"
              value={String(local.border.color)}
              onChange={(value) =>
                handleChange({
                  border: { ...local.border!, color: value },
                })
              }
            />
            <NumberField
              label="Width"
              value={local.border.width}
              onChange={(value) =>
                handleChange({
                  border: { ...local.border!, width: value },
                })
              }
              min={0}
              max={20}
            />
          </>
        )}
      </div>
    </div>
  );
}
