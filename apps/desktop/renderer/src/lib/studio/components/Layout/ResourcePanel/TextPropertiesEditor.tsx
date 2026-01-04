import {
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
} from 'lucide-react';
import type { ITextData } from '../../../types/text';

interface TextPropertiesEditorProps {
  data: ITextData;
  onChange: (updates: Partial<ITextData>) => void;
}

export function TextPropertiesEditor({
  data,
  onChange,
}: TextPropertiesEditorProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs text-neutral-400">Content</label>
        <textarea
          value={data.content}
          onChange={(e) => onChange({ content: e.target.value })}
          className="bg-neutral-800 text-white p-2 rounded text-sm w-full min-h-[80px] resize-y"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-neutral-400">Font</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={data.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="bg-neutral-800 text-white p-1 rounded text-sm"
            placeholder="Size"
          />
          <input
            type="text"
            value={data.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            className="bg-neutral-800 text-white p-1 rounded text-sm"
            placeholder="Family"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-800 rounded p-1 gap-1">
            <button
              onClick={() => onChange({ bold: !data.bold })}
              className={`p-1 rounded hover:bg-neutral-700 ${
                data.bold ? 'bg-neutral-600' : ''
              }`}
            >
              <BoldIcon size={14} />
            </button>
            <button
              onClick={() => onChange({ italic: !data.italic })}
              className={`p-1 rounded hover:bg-neutral-700 ${
                data.italic ? 'bg-neutral-600' : ''
              }`}
            >
              <ItalicIcon size={14} />
            </button>
            <button
              onClick={() => onChange({ underline: !data.underline })}
              className={`p-1 rounded hover:bg-neutral-700 ${
                data.underline ? 'bg-neutral-600' : ''
              }`}
            >
              <UnderlineIcon size={14} />
            </button>
          </div>
          <input
            type="color"
            value={String(data.color)}
            onChange={(e) => onChange({ color: e.target.value })}
            className="bg-neutral-800 h-8 w-8 rounded cursor-pointer"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-neutral-400">Spacing</label>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <label className="text-xs w-12">Letter</label>
            <input
              type="number"
              value={data.letterSpacing ?? 0}
              onChange={(e) =>
                onChange({ letterSpacing: Number(e.target.value) })
              }
              className="bg-neutral-800 text-white p-1 rounded text-sm w-16"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs w-12">Line</label>
            <input
              type="number"
              step="0.1"
              value={data.lineHeight ?? 1}
              onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
              className="bg-neutral-800 text-white p-1 rounded text-sm w-16"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-neutral-400">Alignment</label>
        <div className="flex items-center bg-neutral-800 rounded p-1 gap-1 w-fit">
          <button
            onClick={() => onChange({ align: 'left' })}
            className={`p-1 rounded hover:bg-neutral-700 ${
              data.align === 'left' ? 'bg-neutral-600' : ''
            }`}
          >
            <AlignLeftIcon size={14} />
          </button>
          <button
            onClick={() => onChange({ align: 'center' })}
            className={`p-1 rounded hover:bg-neutral-700 ${
              data.align === 'center' ? 'bg-neutral-600' : ''
            }`}
          >
            <AlignCenterIcon size={14} />
          </button>
          <button
            onClick={() => onChange({ align: 'right' })}
            className={`p-1 rounded hover:bg-neutral-700 ${
              data.align === 'right' ? 'bg-neutral-600' : ''
            }`}
          >
            <AlignRightIcon size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-neutral-400">Background</label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!data.background}
              onChange={(e) => {
                if (e.target.checked) {
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
            <span className="text-sm">Enable Background</span>
          </div>

          {data.background && (
            <div className="flex flex-col gap-2 pl-4 border-l border-neutral-700">
              <div className="flex items-center gap-2">
                <label className="text-xs w-16">Color</label>
                <input
                  type="color"
                  value={String(data.background.color)}
                  onChange={(e) =>
                    onChange({
                      background: {
                        ...data.background!,
                        color: e.target.value,
                      },
                    })
                  }
                  className="bg-neutral-800 h-6 w-8 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs w-16">Padding X</label>
                <input
                  type="number"
                  value={data.background.paddingX}
                  onChange={(e) =>
                    onChange({
                      background: {
                        ...data.background!,
                        paddingX: Number(e.target.value),
                      },
                    })
                  }
                  className="bg-neutral-800 text-white p-1 rounded text-sm w-16"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs w-16">Padding Y</label>
                <input
                  type="number"
                  value={data.background.paddingY}
                  onChange={(e) =>
                    onChange({
                      background: {
                        ...data.background!,
                        paddingY: Number(e.target.value),
                      },
                    })
                  }
                  className="bg-neutral-800 text-white p-1 rounded text-sm w-16"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs w-16">Radius</label>
                <input
                  type="number"
                  value={data.background.radius}
                  onChange={(e) =>
                    onChange({
                      background: {
                        ...data.background!,
                        radius: Number(e.target.value),
                      },
                    })
                  }
                  className="bg-neutral-800 text-white p-1 rounded text-sm w-16"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs w-16">Alpha</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={data.background.alpha ?? 1}
                  onChange={(e) =>
                    onChange({
                      background: {
                        ...data.background!,
                        alpha: Number(e.target.value),
                      },
                    })
                  }
                  className="w-24"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-neutral-400">Shadow</label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!data.shadow}
              onChange={(e) => {
                if (e.target.checked) {
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
            <span className="text-sm">Enable Shadow</span>
          </div>

          {data.shadow && (
            <div className="flex flex-col gap-2 pl-4 border-l border-neutral-700">
              <div className="flex items-center gap-2">
                <label className="text-xs w-16">Color</label>
                <input
                  type="color"
                  value={String(data.shadow.color)}
                  onChange={(e) =>
                    onChange({
                      shadow: { ...data.shadow!, color: e.target.value },
                    })
                  }
                  className="bg-neutral-800 h-6 w-8 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs w-16">Blur</label>
                <input
                  type="number"
                  value={data.shadow.blur}
                  onChange={(e) =>
                    onChange({
                      shadow: { ...data.shadow!, blur: Number(e.target.value) },
                    })
                  }
                  className="bg-neutral-800 text-white p-1 rounded text-sm w-16"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs w-16">Offset X</label>
                <input
                  type="number"
                  value={data.shadow.offsetX}
                  onChange={(e) =>
                    onChange({
                      shadow: {
                        ...data.shadow!,
                        offsetX: Number(e.target.value),
                      },
                    })
                  }
                  className="bg-neutral-800 text-white p-1 rounded text-sm w-16"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs w-16">Offset Y</label>
                <input
                  type="number"
                  value={data.shadow.offsetY}
                  onChange={(e) =>
                    onChange({
                      shadow: {
                        ...data.shadow!,
                        offsetY: Number(e.target.value),
                      },
                    })
                  }
                  className="bg-neutral-800 text-white p-1 rounded text-sm w-16"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs w-16">Alpha</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={data.shadow.alpha ?? 1}
                  onChange={(e) =>
                    onChange({
                      shadow: {
                        ...data.shadow!,
                        alpha: Number(e.target.value),
                      },
                    })
                  }
                  className="w-24"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
