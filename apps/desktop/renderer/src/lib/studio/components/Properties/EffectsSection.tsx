import { Section, NumberField, ToggleField } from '../inputs';
import type { IEffect } from '../../types/effect';
import { Button } from '@renderer/components/Button';
import { Plus, Trash2 } from 'lucide-react';

interface EffectsSectionProps {
  effects: IEffect[];
  onChange: (effects: IEffect[]) => void;
}

export function EffectsSection({ effects, onChange }: EffectsSectionProps) {
  const handleAddEffect = () => {
    const newEffect: IEffect = {
      id: `effect-${Date.now()}`,
      type: 'blur',
      enabled: true,
      parameters: {
        strength: 8,
        quality: 4,
      },
    };
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

  return (
    <Section title="Effects">
      <div className="flex flex-col gap-3">
        {/* Add Effect Button */}
        <Button
          variant="secondary"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleAddEffect}
        >
          <Plus className="w-4 h-4" />
          <span>Add Blur Effect</span>
        </Button>

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
                  Blur Effect
                </span>
              </div>
              <button
                onClick={() => handleRemoveEffect(effect.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Effect Parameters */}
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
