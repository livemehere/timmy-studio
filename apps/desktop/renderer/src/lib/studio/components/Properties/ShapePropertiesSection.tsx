import { Section, InputField, NumberField, ToggleField } from '../inputs';
import type { IShapeData } from '../../types/shape';

interface ShapePropertiesSectionProps {
  shapeData: IShapeData;
  onChange: (updates: Partial<IShapeData>) => void;
}

export function ShapePropertiesSection({
  shapeData,
  onChange,
}: ShapePropertiesSectionProps) {
  return (
    <Section title="Shape Properties">
      <div className="flex flex-col gap-2">
        <div className="text-xs text-neutral-400 mb-1">Shape Type</div>
        <div className="flex gap-2">
          {(['rectangle', 'circle', 'polygon'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onChange({ shapeType: type })}
              className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors ${
                shapeData.shapeType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <NumberField
        label="Width"
        value={shapeData.width}
        onChange={(value) => onChange({ width: value })}
        min={1}
        max={4000}
        showRange
      />

      <NumberField
        label="Height"
        value={shapeData.height}
        onChange={(value) => onChange({ height: value })}
        min={1}
        max={4000}
        showRange
      />

      <InputField
        label="Color"
        value={String(shapeData.color)}
        onChange={(value) => onChange({ color: value })}
        type="color"
      />

      {(shapeData.shapeType === 'rectangle' ||
        shapeData.shapeType === 'polygon') && (
        <NumberField
          label="Radius"
          value={shapeData.radius ?? 0}
          onChange={(value) => onChange({ radius: value })}
          min={0}
          max={100}
        />
      )}

      {/* Border */}
      <div className="flex flex-col gap-2 mt-4">
        <div className="text-xs text-neutral-400 mb-1">Border</div>
        <ToggleField
          label="Enable"
          checked={!!shapeData.border}
          onChange={(checked) => {
            if (checked) {
              onChange({
                border: {
                  color: '#ffffff',
                  width: 2,
                },
              });
            } else {
              onChange({ border: undefined });
            }
          }}
        />
        {shapeData.border && (
          <>
            <InputField
              label="Color"
              value={String(shapeData.border.color)}
              onChange={(value) =>
                onChange({
                  border: { ...shapeData.border!, color: value },
                })
              }
              type="color"
            />
            <NumberField
              label="Width"
              value={shapeData.border.width}
              onChange={(value) =>
                onChange({
                  border: { ...shapeData.border!, width: value },
                })
              }
              min={0}
              max={20}
            />
          </>
        )}
      </div>
    </Section>
  );
}
