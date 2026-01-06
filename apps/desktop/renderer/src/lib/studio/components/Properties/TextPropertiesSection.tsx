import { Section, InputField, NumberField, ToggleField } from '../inputs';
import { TextAreaField } from '@renderer/lib/studio/components/inputs/TextAreaField';
import type { ITextData } from '../../types/text';

interface TextPropertiesSectionProps {
  textData: ITextData;
  onChange: (updates: Partial<ITextData>) => void;
}

export function TextPropertiesSection({
  textData,
  onChange,
}: TextPropertiesSectionProps) {
  return (
    <Section title="Text Properties">
      <TextAreaField
        label="Content"
        value={textData.content}
        onChange={(value) => onChange({ content: value })}
      />

      <InputField
        label="Font Family"
        value={textData.fontFamily}
        onChange={(value) => onChange({ fontFamily: value })}
      />

      <NumberField
        label="Font Size"
        value={textData.fontSize}
        onChange={(value) => onChange({ fontSize: value })}
        min={8}
        max={200}
        showRange
      />

      <InputField
        label="Color"
        value={String(textData.color)}
        onChange={(value) => onChange({ color: value })}
        type="color"
      />

      <div className="flex flex-col gap-2 mt-2">
        <div className="text-xs text-neutral-400 mb-1">Alignment</div>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onChange({ align })}
              className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors ${
                textData.align === align
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
          checked={textData.bold ?? false}
          onChange={(checked) => onChange({ bold: checked })}
        />
        <ToggleField
          label="Italic"
          checked={textData.italic ?? false}
          onChange={(checked) => onChange({ italic: checked })}
        />
        <ToggleField
          label="Underline"
          checked={textData.underline ?? false}
          onChange={(checked) => onChange({ underline: checked })}
        />
      </div>

      <NumberField
        label="Letter Spacing"
        value={textData.letterSpacing ?? 0}
        onChange={(value) => onChange({ letterSpacing: value })}
        min={-10}
        max={50}
        step={0.5}
      />

      <NumberField
        label="Line Height"
        value={textData.lineHeight ?? 1}
        onChange={(value) => onChange({ lineHeight: value })}
        min={0.5}
        max={3}
        step={0.1}
      />

      {/* Background */}
      <div className="flex flex-col gap-2 mt-4">
        <div className="text-xs text-neutral-400 mb-1">Background</div>
        <ToggleField
          label="Enable"
          checked={!!textData.background}
          onChange={(checked) => {
            if (checked) {
              onChange({
                background: {
                  color: '#000000',
                  paddingX: 10,
                  paddingY: 10,
                  radius: 0,
                  alpha: 1,
                },
              });
            } else {
              onChange({ background: undefined });
            }
          }}
        />
        {textData.background && (
          <>
            <InputField
              label="Color"
              value={textData.background.color}
              onChange={(value) =>
                onChange({
                  background: { ...textData.background!, color: value },
                })
              }
              type="color"
            />
            <NumberField
              label="Padding X"
              value={textData.background.paddingX}
              onChange={(value) =>
                onChange({
                  background: { ...textData.background!, paddingX: value },
                })
              }
              min={0}
              max={100}
            />
            <NumberField
              label="Padding Y"
              value={textData.background.paddingY}
              onChange={(value) =>
                onChange({
                  background: { ...textData.background!, paddingY: value },
                })
              }
              min={0}
              max={100}
            />
            <NumberField
              label="Radius"
              value={textData.background.radius}
              onChange={(value) =>
                onChange({
                  background: { ...textData.background!, radius: value },
                })
              }
              min={0}
              max={50}
            />
            <NumberField
              label="Alpha"
              value={textData.background.alpha ?? 1}
              onChange={(value) =>
                onChange({
                  background: { ...textData.background!, alpha: value },
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

      {/* Shadow */}
      <div className="flex flex-col gap-2 mt-4">
        <div className="text-xs text-neutral-400 mb-1">Shadow</div>
        <ToggleField
          label="Enable"
          checked={!!textData.shadow}
          onChange={(checked) => {
            if (checked) {
              onChange({
                shadow: {
                  color: '#000000',
                  blur: 4,
                  offsetX: 2,
                  offsetY: 2,
                  alpha: 0.5,
                },
              });
            } else {
              onChange({ shadow: undefined });
            }
          }}
        />
        {textData.shadow && (
          <>
            <InputField
              label="Color"
              value={textData.shadow.color}
              onChange={(value) =>
                onChange({
                  shadow: { ...textData.shadow!, color: value },
                })
              }
              type="color"
            />
            <NumberField
              label="Blur"
              value={textData.shadow.blur}
              onChange={(value) =>
                onChange({
                  shadow: { ...textData.shadow!, blur: value },
                })
              }
              min={0}
              max={50}
            />
            <NumberField
              label="Offset X"
              value={textData.shadow.offsetX}
              onChange={(value) =>
                onChange({
                  shadow: { ...textData.shadow!, offsetX: value },
                })
              }
              min={-50}
              max={50}
            />
            <NumberField
              label="Offset Y"
              value={textData.shadow.offsetY}
              onChange={(value) =>
                onChange({
                  shadow: { ...textData.shadow!, offsetY: value },
                })
              }
              min={-50}
              max={50}
            />
            <NumberField
              label="Alpha"
              value={textData.shadow.alpha ?? 1}
              onChange={(value) =>
                onChange({
                  shadow: { ...textData.shadow!, alpha: value },
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

      {/* Border */}
      <div className="flex flex-col gap-2 mt-4">
        <div className="text-xs text-neutral-400 mb-1">Border</div>
        <ToggleField
          label="Enable"
          checked={!!textData.border}
          onChange={(checked) => {
            if (checked) {
              onChange({
                border: {
                  color: '#ffffff',
                  width: 1,
                  radius: 0,
                },
              });
            } else {
              onChange({ border: undefined });
            }
          }}
        />
        {textData.border && (
          <>
            <InputField
              label="Color"
              value={String(textData.border.color)}
              onChange={(value) =>
                onChange({
                  border: { ...textData.border!, color: value },
                })
              }
              type="color"
            />
            <NumberField
              label="Width"
              value={textData.border.width}
              onChange={(value) =>
                onChange({
                  border: { ...textData.border!, width: value },
                })
              }
              min={0}
              max={20}
            />
            <NumberField
              label="Radius"
              value={textData.border.radius ?? 0}
              onChange={(value) =>
                onChange({
                  border: { ...textData.border!, radius: value },
                })
              }
              min={0}
              max={50}
            />
          </>
        )}
      </div>
    </Section>
  );
}
