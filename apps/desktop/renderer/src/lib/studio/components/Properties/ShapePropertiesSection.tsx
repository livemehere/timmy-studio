import { Section, InputField, NumberField, ToggleField } from '../inputs';
import type { IShapeData } from '../../types/shape';

interface ShapePropertiesSectionProps {
  shapeData: IShapeData;
  onChange: (updates: IShapeData) => void;
}

export function ShapePropertiesSection({
  shapeData,
  onChange,
}: ShapePropertiesSectionProps) {
  const handleUpdate = (updates: Partial<IShapeData>) => {
    onChange({ ...shapeData, ...updates } as IShapeData);
  };

  return (
    <Section title="Shape Properties">
      <div className="flex flex-col gap-2">
        <div className="text-xs text-neutral-400 mb-1">Shape Type</div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              'rectangle',
              'rounded-rectangle',
              'circle',
              'ellipse',
              'polygon',
            ] as const
          ).map((type) => (
            <button
              key={type}
              onClick={() => {
                const base = {
                  width: shapeData.width,
                  height: shapeData.height,
                  fill: shapeData.fill,
                  stroke: shapeData.stroke,
                };
                if (type === 'rounded-rectangle') {
                  onChange({
                    ...base,
                    shapeType: type,
                    cornerRadius: 20,
                  });
                } else if (type === 'polygon') {
                  onChange({
                    ...base,
                    shapeType: type,
                    sides: 6,
                  });
                } else {
                  onChange({
                    ...base,
                    shapeType: type,
                  } as IShapeData);
                }
              }}
              className={`px-2 py-1.5 rounded text-xs transition-colors ${
                shapeData.shapeType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              }`}
            >
              {type === 'rounded-rectangle'
                ? 'Rounded'
                : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <NumberField
        label="Width"
        value={shapeData.width}
        onChange={(value) => handleUpdate({ width: value })}
        min={1}
        max={4000}
        showRange
      />

      <NumberField
        label="Height"
        value={shapeData.height}
        onChange={(value) => handleUpdate({ height: value })}
        min={1}
        max={4000}
        showRange
      />

      {/* Fill */}
      <div className="flex flex-col gap-2 mt-2">
        <div className="text-xs text-neutral-400 mb-1">Fill</div>
        <InputField
          label="Color"
          value={String(shapeData.fill.color)}
          onChange={(value) =>
            handleUpdate({
              fill: { ...shapeData.fill, color: value },
            })
          }
          type="color"
        />
        <NumberField
          label="Opacity"
          value={shapeData.fill.opacity ?? 1}
          onChange={(value) =>
            handleUpdate({
              fill: { ...shapeData.fill, opacity: value },
            })
          }
          min={0}
          max={1}
          step={0.01}
          showRange
        />
      </div>

      {/* Rounded Rectangle Corner Radius */}
      {shapeData.shapeType === 'rounded-rectangle' && (
        <NumberField
          label="Corner Radius"
          value={shapeData.cornerRadius}
          onChange={(value) =>
            handleUpdate({ cornerRadius: value } as Partial<IShapeData>)
          }
          min={0}
          max={100}
        />
      )}

      {/* Polygon Sides */}
      {shapeData.shapeType === 'polygon' && (
        <NumberField
          label="Sides"
          value={shapeData.sides}
          onChange={(value) =>
            handleUpdate({ sides: Math.max(3, Math.floor(value)) })
          }
          min={3}
          max={20}
        />
      )}

      {/* Stroke */}
      <div className="flex flex-col gap-2 mt-4">
        <div className="text-xs text-neutral-400 mb-1">Stroke</div>
        <ToggleField
          label="Enable"
          checked={!!shapeData.stroke}
          onChange={(checked) => {
            if (checked) {
              handleUpdate({
                stroke: {
                  color: '#ffffff',
                  width: 2,
                  opacity: 1,
                },
              });
            } else {
              handleUpdate({ stroke: undefined });
            }
          }}
        />
        {shapeData.stroke && (
          <>
            <InputField
              label="Color"
              value={String(shapeData.stroke.color)}
              onChange={(value) =>
                handleUpdate({
                  stroke: { ...shapeData.stroke!, color: value },
                })
              }
              type="color"
            />
            <NumberField
              label="Width"
              value={shapeData.stroke.width}
              onChange={(value) =>
                handleUpdate({
                  stroke: { ...shapeData.stroke!, width: value },
                })
              }
              min={0}
              max={20}
            />
            <NumberField
              label="Opacity"
              value={shapeData.stroke.opacity ?? 1}
              onChange={(value) =>
                handleUpdate({
                  stroke: { ...shapeData.stroke!, opacity: value },
                })
              }
              min={0}
              max={1}
              step={0.01}
              showRange
            />
          </>
        )}
      </div>
    </Section>
  );
}
