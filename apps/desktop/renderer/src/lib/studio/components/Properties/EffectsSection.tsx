import { Section, NumberField, ToggleField } from '../inputs';
import type { IEffect, EffectType } from '../../types/effect';
import type { IEffectMask } from '../../types/effect';
import { Button } from '@/components/Button';
import { Plus, Trash2 } from 'lucide-react';

interface EffectsSectionProps {
  effects: IEffect[];
  onChange: (effects: IEffect[]) => void;
}

export function EffectsSection({ effects, onChange }: EffectsSectionProps) {
  const handleAddEffect = (type: EffectType) => {
    let newEffect: IEffect;

    switch (type) {
      case 'blur':
        newEffect = {
          id: `effect-${Date.now()}`,
          type: 'blur',
          enabled: true,
          parameters: {
            strength: 8,
            quality: 4,
          },
        };
        break;
      case 'pixelate':
        newEffect = {
          id: `effect-${Date.now()}`,
          type: 'pixelate',
          enabled: true,
          parameters: {
            size: 10,
          },
        };
        break;
      default:
        return;
    }

    onChange([...effects, newEffect]);
  };

  const handleRemoveEffect = (id: string) => {
    onChange(effects.filter((e) => e.id !== id));
  };

  const handleUpdateEffect = (id: string, updates: Partial<IEffect>) => {
    onChange(effects.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const handleUpdateParameter = (id: string, key: string, value: unknown) => {
    onChange(
      effects.map((e) =>
        e.id === id
          ? { ...e, parameters: { ...e.parameters, [key]: value } }
          : e
      )
    );
  };

  const handleUpdateMask = (id: string, updates: Partial<IEffectMask>) => {
    onChange(
      effects.map((e) =>
        e.id === id
          ? { ...e, mask: { ...(e.mask || getDefaultMask()), ...updates } }
          : e
      )
    );
  };

  const getDefaultMask = (): IEffectMask => ({
    enabled: false,
    shape: 'rectangle',
    x: 0.25,
    y: 0.25,
    width: 0.5,
    height: 0.5,
  });

  const getEffectDisplayName = (type: EffectType) => {
    switch (type) {
      case 'blur':
        return 'Blur';
      case 'pixelate':
        return 'Pixelate (Mosaic)';
      default:
        return type;
    }
  };

  return (
    <Section title="Effects">
      <div className="flex flex-col gap-3">
        {/* Add Effect Buttons */}
        <div className="flex flex-col gap-2">
          <div className="text-xs text-neutral-400 mb-1">Add Effect</div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2"
              onClick={() => handleAddEffect('blur')}
            >
              <Plus className="w-4 h-4" />
              <span>Blur</span>
            </Button>
            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2"
              onClick={() => handleAddEffect('pixelate')}
            >
              <Plus className="w-4 h-4" />
              <span>Mosaic</span>
            </Button>
          </div>
        </div>

        {/* Effects List */}
        {effects.map((effect) => (
          <div
            key={effect.id}
            className="border border-neutral-700 rounded p-3 space-y-2"
          >
            {/* Effect Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ToggleField
                  label=""
                  checked={effect.enabled}
                  onChange={(checked) =>
                    handleUpdateEffect(effect.id, { enabled: checked })
                  }
                />
                <span className="text-sm text-neutral-300 font-medium">
                  {getEffectDisplayName(effect.type)}
                </span>
              </div>
              <button
                onClick={() => handleRemoveEffect(effect.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Effect Parameters - Blur */}
            {effect.enabled && effect.type === 'blur' && (
              <div className="space-y-2 pt-2 border-t border-neutral-700">
                <NumberField
                  label="Strength"
                  value={(effect.parameters.strength as number) ?? 8}
                  onChange={(value) =>
                    handleUpdateParameter(effect.id, 'strength', value)
                  }
                  min={0}
                  max={32}
                  step={0.5}
                  showRange
                />
                <NumberField
                  label="Quality"
                  value={(effect.parameters.quality as number) ?? 4}
                  onChange={(value) =>
                    handleUpdateParameter(
                      effect.id,
                      'quality',
                      Math.floor(value)
                    )
                  }
                  min={1}
                  max={15}
                  step={1}
                  showRange
                />
                <div className="text-xs text-neutral-500 mt-1">
                  Quality: 높을수록 부드러운 블러 (성능 영향)
                </div>
              </div>
            )}

            {/* Effect Parameters - Pixelate */}
            {effect.enabled && effect.type === 'pixelate' && (
              <div className="space-y-2 pt-2 border-t border-neutral-700">
                <NumberField
                  label="Pixel Size"
                  value={(effect.parameters.size as number) ?? 10}
                  onChange={(value) =>
                    handleUpdateParameter(effect.id, 'size', value)
                  }
                  min={1}
                  max={50}
                  step={1}
                  showRange
                />
                <div className="text-xs text-neutral-500 mt-1">
                  Pixel Size: 클수록 큰 모자이크 효과
                </div>
              </div>
            )}

            {/* Mask Settings - Common for all effects */}
            {effect.enabled && (
              <div className="space-y-2 pt-2 border-t border-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">
                    특정 영역만 적용
                  </span>
                  <ToggleField
                    label=""
                    checked={effect.mask?.enabled ?? false}
                    onChange={(checked) =>
                      handleUpdateMask(effect.id, { enabled: checked })
                    }
                  />
                </div>

                {effect.mask?.enabled && (
                  <div className="space-y-2 pl-2">
                    {/* Mask Shape */}
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">
                        마스크 모양
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleUpdateMask(effect.id, {
                              shape: 'rectangle',
                            })
                          }
                          className={`flex-1 px-3 py-1.5 text-xs rounded border transition-colors ${
                            (effect.mask?.shape ?? 'rectangle') === 'rectangle'
                              ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                              : 'border-neutral-600 text-neutral-400 hover:border-neutral-500'
                          }`}
                        >
                          사각형
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateMask(effect.id, { shape: 'ellipse' })
                          }
                          className={`flex-1 px-3 py-1.5 text-xs rounded border transition-colors ${
                            effect.mask?.shape === 'ellipse'
                              ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                              : 'border-neutral-600 text-neutral-400 hover:border-neutral-500'
                          }`}
                        >
                          원형
                        </button>
                      </div>
                    </div>

                    {/* Mask Position & Size (Normalized 0-1) */}
                    <NumberField
                      label="X 위치 (%)"
                      value={+((effect.mask?.x ?? 0.25) * 100).toFixed(0)}
                      onChange={(value) =>
                        handleUpdateMask(effect.id, { x: value / 100 })
                      }
                      min={0}
                      max={100}
                      step={1}
                      showRange
                    />
                    <NumberField
                      label="Y 위치 (%)"
                      value={+((effect.mask?.y ?? 0.25) * 100).toFixed(0)}
                      onChange={(value) =>
                        handleUpdateMask(effect.id, { y: value / 100 })
                      }
                      min={0}
                      max={100}
                      step={1}
                      showRange
                    />
                    <NumberField
                      label="폭 (%)"
                      value={+((effect.mask?.width ?? 0.5) * 100).toFixed(0)}
                      onChange={(value) =>
                        handleUpdateMask(effect.id, { width: value / 100 })
                      }
                      min={1}
                      max={100}
                      step={1}
                      showRange
                    />
                    <NumberField
                      label="높이 (%)"
                      value={+((effect.mask?.height ?? 0.5) * 100).toFixed(0)}
                      onChange={(value) =>
                        handleUpdateMask(effect.id, { height: value / 100 })
                      }
                      min={1}
                      max={100}
                      step={1}
                      showRange
                    />
                    <div className="text-xs text-neutral-500 mt-1">
                      슬라이더로 마스크 영역을 조정하세요
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {effects.length === 0 && (
          <div className="text-sm text-neutral-500 text-center py-4">
            효과가 없습니다. 추가 버튼을 눌러 효과를 추가하세요.
          </div>
        )}
      </div>
    </Section>
  );
}
