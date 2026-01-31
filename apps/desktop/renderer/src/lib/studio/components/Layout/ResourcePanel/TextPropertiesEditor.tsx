import {
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  Type,
  Palette,
  Square,
  Sun,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
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
    <Accordion
      type="multiple"
      defaultValue={['content', 'font', 'spacing', 'alignment']}
      className="w-full space-y-2"
    >
      {/* Content */}
      <AccordionItem
        value="content"
        className="border-neutral-800 rounded-lg bg-neutral-800/30 px-3"
      >
        <AccordionTrigger className="py-2 hover:no-underline">
          <div className="flex items-center gap-2 text-sm">
            <Type className="h-4 w-4 text-neutral-400" />
            <span>Content</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <Textarea
            value={data.content}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder="Enter text..."
            className="bg-neutral-800/50 border-neutral-700 min-h-20 resize-y text-sm"
          />
        </AccordionContent>
      </AccordionItem>

      {/* Font */}
      <AccordionItem
        value="font"
        className="border-neutral-800 rounded-lg bg-neutral-800/30 px-3"
      >
        <AccordionTrigger className="py-2 hover:no-underline">
          <div className="flex items-center gap-2 text-sm">
            <BoldIcon className="h-4 w-4 text-neutral-400" />
            <span>Font</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">Size</Label>
              <Input
                type="number"
                value={data.fontSize}
                onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
                className="h-8 bg-neutral-800/50 border-neutral-700"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">Family</Label>
              <Input
                type="text"
                value={data.fontFamily}
                onChange={(e) => onChange({ fontFamily: e.target.value })}
                className="h-8 bg-neutral-800/50 border-neutral-700"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <ToggleGroup type="multiple" size="sm" className="justify-start">
              <ToggleGroupItem
                value="bold"
                pressed={data.bold}
                onPressedChange={(pressed) => onChange({ bold: pressed })}
                className="h-8 w-8 data-[state=on]:bg-neutral-600"
              >
                <BoldIcon className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="italic"
                pressed={data.italic}
                onPressedChange={(pressed) => onChange({ italic: pressed })}
                className="h-8 w-8 data-[state=on]:bg-neutral-600"
              >
                <ItalicIcon className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="underline"
                pressed={data.underline}
                onPressedChange={(pressed) => onChange({ underline: pressed })}
                className="h-8 w-8 data-[state=on]:bg-neutral-600"
              >
                <UnderlineIcon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-neutral-400">Color</Label>
              <input
                type="color"
                value={String(data.color)}
                onChange={(e) => onChange({ color: e.target.value })}
                className="h-8 w-8 rounded-md cursor-pointer border border-neutral-700 bg-transparent p-0.5"
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Spacing */}
      <AccordionItem
        value="spacing"
        className="border-neutral-800 rounded-lg bg-neutral-800/30 px-3"
      >
        <AccordionTrigger className="py-2 hover:no-underline">
          <div className="flex items-center gap-2 text-sm">
            <Type className="h-4 w-4 text-neutral-400" />
            <span>Spacing</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-neutral-400">Letter Spacing</Label>
              <span className="text-xs text-neutral-300 tabular-nums">
                {data.letterSpacing ?? 0}
              </span>
            </div>
            <Slider
              value={[data.letterSpacing ?? 0]}
              onValueChange={([v]) => onChange({ letterSpacing: v })}
              min={-10}
              max={50}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-neutral-400">Line Height</Label>
              <span className="text-xs text-neutral-300 tabular-nums">
                {(data.lineHeight ?? 1).toFixed(1)}
              </span>
            </div>
            <Slider
              value={[data.lineHeight ?? 1]}
              onValueChange={([v]) => onChange({ lineHeight: v })}
              min={0.5}
              max={3}
              step={0.1}
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Alignment */}
      <AccordionItem
        value="alignment"
        className="border-neutral-800 rounded-lg bg-neutral-800/30 px-3"
      >
        <AccordionTrigger className="py-2 hover:no-underline">
          <div className="flex items-center gap-2 text-sm">
            <AlignCenterIcon className="h-4 w-4 text-neutral-400" />
            <span>Alignment</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <ToggleGroup
            type="single"
            value={data.align}
            onValueChange={(v) =>
              v && onChange({ align: v as 'left' | 'center' | 'right' })
            }
            size="sm"
            className="justify-start"
          >
            <ToggleGroupItem
              value="left"
              className="h-8 w-10 data-[state=on]:bg-neutral-600"
            >
              <AlignLeftIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="center"
              className="h-8 w-10 data-[state=on]:bg-neutral-600"
            >
              <AlignCenterIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="right"
              className="h-8 w-10 data-[state=on]:bg-neutral-600"
            >
              <AlignRightIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </AccordionContent>
      </AccordionItem>

      {/* Background */}
      <AccordionItem
        value="background"
        className="border-neutral-800 rounded-lg bg-neutral-800/30 px-3"
      >
        <AccordionTrigger className="py-2 hover:no-underline">
          <div className="flex items-center gap-2 text-sm">
            <Square className="h-4 w-4 text-neutral-400" />
            <span>Background</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable Background</Label>
            <Switch
              checked={!!data.background}
              onCheckedChange={(checked) => {
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
          </div>

          {data.background && (
            <div className="space-y-3 pt-2 border-t border-neutral-700/50">
              <div className="flex items-center gap-3">
                <Label className="text-xs text-neutral-400 w-16">Color</Label>
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
                  className="h-7 w-10 rounded cursor-pointer border border-neutral-700 bg-transparent p-0.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-400">Padding X</Label>
                  <Input
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
                    className="h-8 bg-neutral-800/50 border-neutral-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-400">Padding Y</Label>
                  <Input
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
                    className="h-8 bg-neutral-800/50 border-neutral-700"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Radius</Label>
                <Input
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
                  className="h-8 bg-neutral-800/50 border-neutral-700"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-400">Alpha</Label>
                  <span className="text-xs text-neutral-300 tabular-nums">
                    {(data.background.alpha ?? 1).toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[data.background.alpha ?? 1]}
                  onValueChange={([v]) =>
                    onChange({ background: { ...data.background!, alpha: v } })
                  }
                  min={0}
                  max={1}
                  step={0.1}
                />
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* Shadow */}
      <AccordionItem
        value="shadow"
        className="border-neutral-800 rounded-lg bg-neutral-800/30 px-3"
      >
        <AccordionTrigger className="py-2 hover:no-underline">
          <div className="flex items-center gap-2 text-sm">
            <Sun className="h-4 w-4 text-neutral-400" />
            <span>Shadow</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable Shadow</Label>
            <Switch
              checked={!!data.shadow}
              onCheckedChange={(checked) => {
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
          </div>

          {data.shadow && (
            <div className="space-y-3 pt-2 border-t border-neutral-700/50">
              <div className="flex items-center gap-3">
                <Label className="text-xs text-neutral-400 w-16">Color</Label>
                <input
                  type="color"
                  value={String(data.shadow.color)}
                  onChange={(e) =>
                    onChange({
                      shadow: { ...data.shadow!, color: e.target.value },
                    })
                  }
                  className="h-7 w-10 rounded cursor-pointer border border-neutral-700 bg-transparent p-0.5"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-400">Blur</Label>
                  <span className="text-xs text-neutral-300 tabular-nums">
                    {data.shadow.blur}
                  </span>
                </div>
                <Slider
                  value={[data.shadow.blur]}
                  onValueChange={([v]) =>
                    onChange({ shadow: { ...data.shadow!, blur: v } })
                  }
                  min={0}
                  max={50}
                  step={1}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-400">Offset X</Label>
                  <Input
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
                    className="h-8 bg-neutral-800/50 border-neutral-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-400">Offset Y</Label>
                  <Input
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
                    className="h-8 bg-neutral-800/50 border-neutral-700"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-400">Alpha</Label>
                  <span className="text-xs text-neutral-300 tabular-nums">
                    {(data.shadow.alpha ?? 1).toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[data.shadow.alpha ?? 1]}
                  onValueChange={([v]) =>
                    onChange({ shadow: { ...data.shadow!, alpha: v } })
                  }
                  min={0}
                  max={1}
                  step={0.1}
                />
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
