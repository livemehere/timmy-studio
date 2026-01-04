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
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={
              data.background !== undefined && data.background !== 'transparent'
            }
            onChange={(e) => {
              onChange({
                background: e.target.checked ? '#000000' : undefined,
              });
            }}
          />
          {data.background !== undefined && (
            <input
              type="color"
              value={String(data.background)}
              onChange={(e) => onChange({ background: e.target.value })}
              className="bg-neutral-800 h-8 w-8 rounded cursor-pointer"
            />
          )}
        </div>
      </div>
    </div>
  );
}
