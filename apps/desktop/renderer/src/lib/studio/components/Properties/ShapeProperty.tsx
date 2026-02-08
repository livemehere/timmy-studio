import { ColorField, NumberField, ToggleField } from '../inputs';
import type {
  IShapeData,
  IFill,
  ILinearGradientFill,
  IRadialGradientFill,
} from '../../types/shape';

interface ShapePropertyProps {
  shapeData: IShapeData;
  onChange: (updates: IShapeData) => void;
  onChanged?: () => void;
}

export function ShapeProperty({
  shapeData,
  onChange,
  onChanged,
}: ShapePropertyProps) {
  const handleUpdate = (updates: Partial<IShapeData>) => {
    onChange({ ...shapeData, ...updates } as IShapeData);
    onChanged?.();
  };

  const handleFillUpdate = (fill: IFill) => {
    onChange({ ...shapeData, fill } as IShapeData);
    onChanged?.();
  };

  return (
    <div className="space-y-2">
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
                onChanged?.();
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

      <div className="flex flex-col gap-2 mt-2">
        <div className="text-xs text-neutral-400 mb-1">Fill Type</div>
        <div className="grid grid-cols-3 gap-2">
          {(['solid', 'linear-gradient', 'radial-gradient'] as const).map(
            (type) => (
              <button
                key={type}
                onClick={() => {
                  if (type === 'solid') {
                    handleFillUpdate({
                      type: 'solid',
                      color:
                        shapeData.fill.type === 'solid'
                          ? shapeData.fill.color
                          : '#3b82f6',
                      opacity: 1,
                    });
                  } else if (type === 'linear-gradient') {
                    handleFillUpdate({
                      type: 'linear-gradient',
                      x0: 0,
                      y0: 0,
                      x1: 1,
                      y1: 1,
                      colorStops: [
                        { offset: 0, color: '#3b82f6', alpha: 1 },
                        { offset: 1, color: '#8b5cf6', alpha: 1 },
                      ],
                    });
                  } else {
                    handleFillUpdate({
                      type: 'radial-gradient',
                      x0: 0.5,
                      y0: 0.5,
                      radius0: 0,
                      x1: 0.5,
                      y1: 0.5,
                      radius1: 0.5,
                      colorStops: [
                        { offset: 0, color: '#3b82f6', alpha: 1 },
                        { offset: 1, color: '#8b5cf6', alpha: 1 },
                      ],
                    });
                  }
                }}
                className={`px-2 py-1.5 rounded text-xs transition-colors ${
                  shapeData.fill.type === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                }`}
              >
                {type === 'solid'
                  ? 'Solid'
                  : type === 'linear-gradient'
                    ? 'Linear'
                    : 'Radial'}
              </button>
            )
          )}
        </div>

        {shapeData.fill.type === 'solid' && (
          <>
            <ColorField
              label="Color"
              value={String(shapeData.fill.color)}
              onChange={(value) => {
                const currentFill = shapeData.fill;
                if (currentFill.type === 'solid') {
                  handleFillUpdate({
                    type: 'solid',
                    color: value,
                    opacity: currentFill.opacity ?? 1,
                  });
                }
              }}
            />
            <NumberField
              label="Opacity"
              value={
                shapeData.fill.type === 'solid'
                  ? (shapeData.fill.opacity ?? 1)
                  : 1
              }
              onChange={(value) => {
                const currentFill = shapeData.fill;
                if (currentFill.type === 'solid') {
                  handleFillUpdate({
                    type: 'solid',
                    color: currentFill.color,
                    opacity: value,
                  });
                }
              }}
              min={0}
              max={1}
              step={0.01}
              showRange
            />
          </>
        )}

        {shapeData.fill.type === 'linear-gradient' && (
          <>
            <div className="text-xs text-neutral-400 mt-2">
              Gradient Direction
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Start X"
                value={shapeData.fill.x0}
                onChange={(value) =>
                  handleFillUpdate({
                    ...shapeData.fill,
                    x0: value,
                  } as ILinearGradientFill)
                }
                min={0}
                max={1}
                step={0.01}
                showRange
              />
              <NumberField
                label="Start Y"
                value={shapeData.fill.y0}
                onChange={(value) =>
                  handleFillUpdate({
                    ...shapeData.fill,
                    y0: value,
                  } as ILinearGradientFill)
                }
                min={0}
                max={1}
                step={0.01}
                showRange
              />
              <NumberField
                label="End X"
                value={shapeData.fill.x1}
                onChange={(value) =>
                  handleFillUpdate({
                    ...shapeData.fill,
                    x1: value,
                  } as ILinearGradientFill)
                }
                min={0}
                max={1}
                step={0.01}
                showRange
              />
              <NumberField
                label="End Y"
                value={shapeData.fill.y1}
                onChange={(value) =>
                  handleFillUpdate({
                    ...shapeData.fill,
                    y1: value,
                  } as ILinearGradientFill)
                }
                min={0}
                max={1}
                step={0.01}
                showRange
              />
            </div>
            <div className="text-xs text-neutral-400 mt-2">Color Stops</div>
            {shapeData.fill.type === 'linear-gradient' &&
              shapeData.fill.colorStops.map((stop, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <NumberField
                    label={`Stop ${index + 1}`}
                    value={stop.offset}
                    onChange={(value) => {
                      const currentFill = shapeData.fill;
                      if (currentFill.type === 'linear-gradient') {
                        const newStops = [...currentFill.colorStops];
                        newStops[index] = { ...stop, offset: value };
                        handleFillUpdate({
                          ...currentFill,
                          colorStops: newStops,
                        });
                      }
                    }}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                  <ColorField
                    label="Color"
                    value={String(stop.color)}
                    onChange={(value) => {
                      const currentFill = shapeData.fill;
                      if (currentFill.type === 'linear-gradient') {
                        const newStops = [...currentFill.colorStops];
                        newStops[index] = { ...stop, color: value };
                        handleFillUpdate({
                          ...currentFill,
                          colorStops: newStops,
                        });
                      }
                    }}
                  />
                </div>
              ))}
          </>
        )}

        {shapeData.fill.type === 'radial-gradient' && (
          <>
            <div className="text-xs text-neutral-400 mt-2">Inner Circle</div>
            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label="Center X"
                value={shapeData.fill.x0}
                onChange={(value) =>
                  handleFillUpdate({
                    ...shapeData.fill,
                    x0: value,
                  } as IRadialGradientFill)
                }
                min={0}
                max={1}
                step={0.01}
                showRange
              />
              <NumberField
                label="Center Y"
                value={shapeData.fill.y0}
                onChange={(value) =>
                  handleFillUpdate({
                    ...shapeData.fill,
                    y0: value,
                  } as IRadialGradientFill)
                }
                min={0}
                max={1}
                step={0.01}
                showRange
              />
              <NumberField
                label="Radius"
                value={shapeData.fill.radius0}
                onChange={(value) =>
                  handleFillUpdate({
                    ...shapeData.fill,
                    radius0: value,
                  } as IRadialGradientFill)
                }
                min={0}
                max={1}
                step={0.01}
                showRange
              />
            </div>
            <div className="text-xs text-neutral-400 mt-2">Outer Circle</div>
            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label="Center X"
                value={shapeData.fill.x1}
                onChange={(value) =>
                  handleFillUpdate({
                    ...shapeData.fill,
                    x1: value,
                  } as IRadialGradientFill)
                }
                min={0}
                max={1}
                step={0.01}
                showRange
              />
              <NumberField
                label="Center Y"
                value={shapeData.fill.y1}
                onChange={(value) =>
                  handleFillUpdate({
                    ...shapeData.fill,
                    y1: value,
                  } as IRadialGradientFill)
                }
                min={0}
                max={1}
                step={0.01}
                showRange
              />
              <NumberField
                label="Radius"
                value={shapeData.fill.radius1}
                onChange={(value) =>
                  handleFillUpdate({
                    ...shapeData.fill,
                    radius1: value,
                  } as IRadialGradientFill)
                }
                min={0}
                max={1}
                step={0.01}
                showRange
              />
            </div>
            <div className="text-xs text-neutral-400 mt-2">Color Stops</div>
            {shapeData.fill.type === 'radial-gradient' &&
              shapeData.fill.colorStops.map((stop, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <NumberField
                    label={`Stop ${index + 1}`}
                    value={stop.offset}
                    onChange={(value) => {
                      const currentFill = shapeData.fill;
                      if (currentFill.type === 'radial-gradient') {
                        const newStops = [...currentFill.colorStops];
                        newStops[index] = { ...stop, offset: value };
                        handleFillUpdate({
                          ...currentFill,
                          colorStops: newStops,
                        });
                      }
                    }}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                  <ColorField
                    label="Color"
                    value={String(stop.color)}
                    onChange={(value) => {
                      const currentFill = shapeData.fill;
                      if (currentFill.type === 'radial-gradient') {
                        const newStops = [...currentFill.colorStops];
                        newStops[index] = { ...stop, color: value };
                        handleFillUpdate({
                          ...currentFill,
                          colorStops: newStops,
                        });
                      }
                    }}
                  />
                </div>
              ))}
          </>
        )}
      </div>

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
            <ColorField
              label="Color"
              value={String(shapeData.stroke.color)}
              onChange={(value) =>
                handleUpdate({
                  stroke: { ...shapeData.stroke!, color: value },
                })
              }
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
    </div>
  );
}
