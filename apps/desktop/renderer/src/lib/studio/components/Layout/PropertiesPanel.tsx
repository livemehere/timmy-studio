import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import type { ITrack } from '@renderer/lib/studio/domains/Track/types';
import type {
  IClip,
  IGraphicClip,
  ITextClip,
} from '@renderer/lib/studio/domains/Clip/types';
import {
  Section,
  InputField,
  NumberField,
  ToggleField,
  AlignPresetButtons,
} from '../inputs';

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-neutral-400 w-24 shrink-0">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500 transition-colors resize-y min-h-[80px]"
      />
    </div>
  );
}

function findClipInTracks(
  tracks: ITrack[],
  clipId: string
): { trackId: string; clip: IClip } | null {
  for (const track of tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) return { trackId: track.id, clip };
  }
  return null;
}

export function PropertiesPanel() {
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);
  const tracks = useDocStore((state) => state.tracks);
  const updateClipInTrack = useDocStore((state) => state.updateClip);
  const settings = useDocStore((state) => state.settings);

  const selectedClipId = selectedClipIds[0];
  if (!selectedClipId) {
    return (
      <div className="p-4 text-center text-neutral-500 text-sm">
        Select a clip to edit properties
      </div>
    );
  }

  const result = findClipInTracks(tracks, selectedClipId);
  if (!result) {
    return <div>Clip not found</div>;
  }

  const { clip, trackId } = result;
  const graphicClip = clip.type !== 'audio' ? (clip as IGraphicClip) : null;
  const textClip = clip.type === 'text' ? (clip as ITextClip) : null;

  const canvasWidth = settings.width;
  const canvasHeight = settings.height;

  const updateClip = (updates: Partial<IClip>) => {
    updateClipInTrack(trackId, clip.id, updates);
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto p-4">
      <Section title="Basic">
        <InputField label="ID" value={clip.id} readOnly />
        <InputField
          label="Name"
          value={clip.name}
          onChange={(value) => updateClip({ name: value })}
        />
        <InputField label="Type" value={clip.type} readOnly />
      </Section>

      <Section title="Timing">
        <NumberField
          label="Start"
          value={clip.startTime}
          onChange={(value) => updateClip({ startTime: value })}
        />
        <NumberField
          label="End"
          value={clip.endTime}
          onChange={(value) => updateClip({ endTime: value })}
        />
      </Section>

      {'trimStart' in clip && (
        <Section title="Trim">
          <NumberField
            label="Start"
            value={clip.trimStart ?? 0}
            onChange={(value) =>
              updateClip({ trimStart: value || undefined } as any)
            }
          />
          <NumberField
            label="End"
            value={clip.trimEnd ?? 0}
            onChange={(value) =>
              updateClip({ trimEnd: value || undefined } as any)
            }
          />
        </Section>
      )}

      {'volume' in clip && (
        <Section title="Audio">
          <NumberField
            label="Volume"
            value={clip.volume ?? 0}
            onChange={(value) => updateClip({ volume: value } as any)}
            min={0}
            max={1}
            step={0.1}
            showRange
          />
        </Section>
      )}

      {'zIndex' in clip && (
        <Section title="Layer">
          <NumberField
            label="Z Index"
            value={clip.zIndex ?? 0}
            onChange={(value) => updateClip({ zIndex: value } as any)}
          />
        </Section>
      )}

      {graphicClip && (
        <TransformsSection
          transforms={graphicClip.transforms}
          onChange={(path, value) => {
            const newTransforms = updateTransformAtPath(
              graphicClip.transforms,
              path,
              value
            );
            updateClip({ transforms: newTransforms } as any);
          }}
          isTextClip={clip.type === 'text'}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}

      {textClip && (
        <Section title="Text Properties">
          <TextAreaField
            label="Content"
            value={textClip.textData.content}
            onChange={(value) =>
              updateClip({
                textData: { ...textClip.textData, content: value },
              })
            }
          />
          <ToggleField
            label="Bold"
            checked={textClip.textData.bold ?? false}
            onChange={(checked) =>
              updateClip({ textData: { ...textClip.textData, bold: checked } })
            }
          />
          <ToggleField
            label="Italic"
            checked={textClip.textData.italic ?? false}
            onChange={(checked) =>
              updateClip({
                textData: { ...textClip.textData, italic: checked },
              })
            }
          />
          <NumberField
            label="Font Size"
            value={textClip.textData.fontSize}
            onChange={(value) =>
              updateClip({
                textData: { ...textClip.textData, fontSize: value },
              })
            }
            min={8}
            max={200}
            showRange
          />
          <NumberField
            label="Letter Spacing"
            value={textClip.textData.letterSpacing ?? 0}
            onChange={(value) =>
              updateClip({
                textData: { ...textClip.textData, letterSpacing: value },
              })
            }
            min={-10}
            max={50}
            step={0.5}
          />
          <NumberField
            label="Line Height"
            value={textClip.textData.lineHeight ?? 1}
            onChange={(value) =>
              updateClip({
                textData: { ...textClip.textData, lineHeight: value },
              })
            }
            min={0.5}
            max={3}
            step={0.1}
          />
          <InputField
            label="Color"
            value={String(textClip.textData.color)}
            onChange={(value) =>
              updateClip({
                textData: { ...textClip.textData, color: value },
              })
            }
            type="color"
          />
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-xs text-neutral-400 mb-1">Background</div>
            <ToggleField
              label="Enable"
              checked={!!textClip.textData.background}
              onChange={(checked) => {
                if (checked) {
                  updateClip({
                    textData: {
                      ...textClip.textData,
                      background: {
                        color: '#000000',
                        paddingX: 10,
                        paddingY: 10,
                        radius: 0,
                        alpha: 1,
                      },
                    },
                  });
                } else {
                  updateClip({
                    textData: {
                      ...textClip.textData,
                      background: undefined,
                    },
                  });
                }
              }}
            />
            {textClip.textData.background && (
              <>
                <InputField
                  label="Color"
                  value={textClip.textData.background.color}
                  onChange={(value) =>
                    updateClip({
                      textData: {
                        ...textClip.textData,
                        background: {
                          ...textClip.textData.background!,
                          color: value,
                        },
                      },
                    })
                  }
                  type="color"
                />
                <NumberField
                  label="Padding X"
                  value={textClip.textData.background.paddingX}
                  onChange={(value) =>
                    updateClip({
                      textData: {
                        ...textClip.textData,
                        background: {
                          ...textClip.textData.background!,
                          paddingX: value,
                        },
                      },
                    })
                  }
                />
                <NumberField
                  label="Padding Y"
                  value={textClip.textData.background.paddingY}
                  onChange={(value) =>
                    updateClip({
                      textData: {
                        ...textClip.textData,
                        background: {
                          ...textClip.textData.background!,
                          paddingY: value,
                        },
                      },
                    })
                  }
                />
                <NumberField
                  label="Radius"
                  value={textClip.textData.background.radius}
                  onChange={(value) =>
                    updateClip({
                      textData: {
                        ...textClip.textData,
                        background: {
                          ...textClip.textData.background!,
                          radius: value,
                        },
                      },
                    })
                  }
                />
                <NumberField
                  label="Alpha"
                  value={textClip.textData.background.alpha ?? 1}
                  onChange={(value) =>
                    updateClip({
                      textData: {
                        ...textClip.textData,
                        background: {
                          ...textClip.textData.background!,
                          alpha: value,
                        },
                      },
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
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-xs text-neutral-400 mb-1">Shadow</div>
            <ToggleField
              label="Enable"
              checked={!!textClip.textData.shadow}
              onChange={(checked) => {
                if (checked) {
                  updateClip({
                    textData: {
                      ...textClip.textData,
                      shadow: {
                        color: '#000000',
                        blur: 4,
                        offsetX: 2,
                        offsetY: 2,
                        alpha: 0.5,
                      },
                    },
                  });
                } else {
                  updateClip({
                    textData: {
                      ...textClip.textData,
                      shadow: undefined,
                    },
                  });
                }
              }}
            />
            {textClip.textData.shadow && (
              <>
                <InputField
                  label="Color"
                  value={textClip.textData.shadow.color}
                  onChange={(value) =>
                    updateClip({
                      textData: {
                        ...textClip.textData,
                        shadow: { ...textClip.textData.shadow!, color: value },
                      },
                    })
                  }
                  type="color"
                />
                <NumberField
                  label="Blur"
                  value={textClip.textData.shadow.blur}
                  onChange={(value) =>
                    updateClip({
                      textData: {
                        ...textClip.textData,
                        shadow: { ...textClip.textData.shadow!, blur: value },
                      },
                    })
                  }
                />
                <NumberField
                  label="Offset X"
                  value={textClip.textData.shadow.offsetX}
                  onChange={(value) =>
                    updateClip({
                      textData: {
                        ...textClip.textData,
                        shadow: {
                          ...textClip.textData.shadow!,
                          offsetX: value,
                        },
                      },
                    })
                  }
                />
                <NumberField
                  label="Offset Y"
                  value={textClip.textData.shadow.offsetY}
                  onChange={(value) =>
                    updateClip({
                      textData: {
                        ...textClip.textData,
                        shadow: {
                          ...textClip.textData.shadow!,
                          offsetY: value,
                        },
                      },
                    })
                  }
                />
                <NumberField
                  label="Alpha"
                  value={textClip.textData.shadow.alpha ?? 1}
                  onChange={(value) =>
                    updateClip({
                      textData: {
                        ...textClip.textData,
                        shadow: {
                          ...textClip.textData.shadow!,
                          alpha: value,
                        },
                      },
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
        </Section>
      )}
    </div>
  );
}

type JsonPrimitive = string | number | boolean | null;
type JsonPath = Array<string | number>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function updateTransformAtPath(
  root: unknown,
  path: JsonPath,
  nextValue: unknown
): unknown {
  if (path.length === 0) return nextValue;

  const [head, ...rest] = path;
  const isIndex = typeof head === 'number';

  if (isIndex) {
    const arr = Array.isArray(root) ? [...root] : [];
    arr[head] = updateTransformAtPath(arr[head], rest, nextValue);
    return arr;
  }

  const obj = isPlainObject(root)
    ? { ...(root as Record<string, unknown>) }
    : {};
  (obj as any)[head] = updateTransformAtPath(
    (obj as any)[head],
    rest,
    nextValue
  );
  return obj;
}

function TransformsSection({
  transforms,
  onChange,
  isTextClip = false,
  canvasWidth = 1920,
  canvasHeight = 1080,
}: {
  transforms: any;
  onChange: (path: JsonPath, value: JsonPrimitive) => void;
  isTextClip?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}) {
  const getPosition = () => transforms?.position;
  const getSize = () => transforms?.size;
  const getScale = () => ({
    x: transforms?.scaleX ?? 1,
    y: transforms?.scaleY ?? 1,
  });
  const getRotation = () => transforms?.rotation ?? 0;
  const getOpacity = () => transforms?.opacity ?? 1;
  const getAnchor = () => ({
    x: transforms?.anchorX ?? 0,
    y: transforms?.anchorY ?? 0,
  });

  return (
    <Section title="Transform">
      <div className="text-xs text-neutral-400 mb-1">Position</div>
      <NumberField
        label="X"
        value={getPosition()?.x ?? 0}
        onChange={(value) => onChange(['position', 'x'], value)}
        max={canvasWidth * 2}
        showRange
      />
      <NumberField
        label="Y"
        value={getPosition()?.y ?? 0}
        onChange={(value) => onChange(['position', 'y'], value)}
        max={canvasHeight * 2}
        showRange
      />

      {!isTextClip && (
        <>
          <div className="text-xs text-neutral-400 mb-1 mt-4">Size</div>
          <NumberField
            label="Width"
            value={getSize()?.width ?? 0}
            onChange={(value) => onChange(['size', 'width'], value)}
            showRange
          />
          <NumberField
            label="Height"
            value={getSize()?.height ?? 0}
            onChange={(value) => onChange(['size', 'height'], value)}
            showRange
          />
        </>
      )}

      <div className="text-xs text-neutral-400 mb-1 mt-4">Scale</div>
      <NumberField
        label="X"
        value={getScale().x}
        onChange={(value) => onChange(['scaleX'], value)}
        min={0.1}
        max={5}
        step={0.1}
        showRange
      />
      <NumberField
        label="Y"
        value={getScale().y}
        onChange={(value) => onChange(['scaleY'], value)}
        min={0.1}
        max={5}
        step={0.1}
        showRange
      />

      <div className="text-xs text-neutral-400 mb-1 mt-4">Rotation</div>
      <NumberField
        label="Degrees"
        value={Math.round((getRotation() * 180) / Math.PI)}
        onChange={(value) => onChange(['rotation'], (value * Math.PI) / 180)}
        min={0}
        max={360}
        showRange
      />

      <div className="text-xs text-neutral-400 mb-1 mt-4">Opacity</div>
      <NumberField
        label="Opacity"
        value={getOpacity()}
        onChange={(value) => onChange(['opacity'], value)}
        min={0}
        max={1}
        step={0.1}
        showRange
      />

      <div className="text-xs text-neutral-400 mb-1 mt-4">Anchor</div>
      <NumberField
        label="X"
        value={getAnchor().x}
        onChange={(value) => onChange(['anchorX'], value)}
        min={0}
        max={1}
        step={0.1}
      />
      <NumberField
        label="Y"
        value={getAnchor().y}
        onChange={(value) => onChange(['anchorY'], value)}
        min={0}
        max={1}
        step={0.1}
      />

      <div className="text-xs text-neutral-400 mb-1 mt-4">Alignment</div>
      <AlignPresetButtons
        currentAlignX="center"
        currentAlignY="center"
        onAlignX={(alignX) => {
          if (alignX === 'left') {
            onChange(['position', 'x'], 0);
          } else if (alignX === 'center') {
            onChange(['position', 'x'], canvasWidth / 2);
          } else {
            onChange(['position', 'x'], canvasWidth);
          }
        }}
        onAlignY={(alignY) => {
          if (alignY === 'top') {
            onChange(['position', 'y'], 0);
          } else if (alignY === 'center') {
            onChange(['position', 'y'], canvasHeight / 2);
          } else {
            onChange(['position', 'y'], canvasHeight);
          }
        }}
      />
    </Section>
  );
}
