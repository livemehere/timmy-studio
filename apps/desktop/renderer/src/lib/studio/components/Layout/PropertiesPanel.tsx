import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import { type ReactNode } from 'react';
import type { ITrack } from '@renderer/lib/studio/domains/Track/types';
import type {
  IClip,
  IGraphicClip,
} from '@renderer/lib/studio/domains/Clip/types';

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

function Field({
  label,
  value,
  type = 'text',
  readOnly = false,
  onChange,
}: {
  label: string;
  value: string | number | boolean;
  type?: 'text' | 'number' | 'checkbox';
  readOnly?: boolean;
  onChange?: (next: string | number | boolean) => void;
}) {
  const safeValue = value ?? '';

  return (
    <label className="flex items-center gap-2">
      <div className="min-w-[120px] shrink-0">{label}</div>
      {type === 'checkbox' ? (
        <input
          type="checkbox"
          checked={Boolean(safeValue)}
          readOnly={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            onChange?.(e.target.checked);
          }}
        />
      ) : (
        <input
          readOnly={readOnly}
          type={type}
          value={typeof safeValue === 'boolean' ? String(safeValue) : safeValue}
          className="bg-neutral-800 py-1 px-2 roudned"
          onChange={(e) => {
            if (readOnly) return;
            if (!onChange) return;

            if (type === 'number') {
              const raw = e.target.value;
              onChange(raw === '' ? '' : Number(raw));
              return;
            }

            onChange(e.target.value);
          }}
        />
      )}
    </label>
  );
}

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function toLeafInputValue(value: JsonPrimitive | undefined): {
  type: 'text' | 'number' | 'checkbox';
  value: string | number | boolean;
} {
  if (typeof value === 'number') return { type: 'number', value };
  if (typeof value === 'string') return { type: 'text', value };
  if (typeof value === 'boolean') return { type: 'checkbox', value };
  if (value === null) return { type: 'text', value: 'null' };
  return { type: 'text', value: '' };
}

type JsonPath = Array<string | number>;

function setAtPath(root: unknown, path: JsonPath, nextValue: unknown): unknown {
  if (path.length === 0) return nextValue;

  const [head, ...rest] = path;
  const isIndex = typeof head === 'number';

  if (isIndex) {
    const arr = Array.isArray(root) ? [...root] : [];
    arr[head] = setAtPath(arr[head], rest, nextValue);
    return arr;
  }

  const obj = isPlainObject(root)
    ? { ...(root as Record<string, unknown>) }
    : {};
  (obj as any)[head] = setAtPath((obj as any)[head], rest, nextValue);
  return obj;
}

function ObjectFieldInputs({
  label,
  value,
  maxDepth = 5,
  readOnly = false,
  onChange,
}: {
  label: string;
  value: unknown;
  maxDepth?: number;
  readOnly?: boolean;
  onChange?: (path: JsonPath, next: string | number | boolean | null) => void;
}) {
  const render = (
    currentLabel: string,
    currentValue: unknown,
    depth: number,
    path: JsonPath
  ): ReactNode => {
    if (depth > maxDepth) {
      return (
        <Field
          key={currentLabel}
          label={currentLabel}
          value={JSON.stringify(currentValue)}
          readOnly={true}
        />
      );
    }

    if (
      typeof currentValue === 'string' ||
      typeof currentValue === 'number' ||
      typeof currentValue === 'boolean' ||
      currentValue === null ||
      currentValue === undefined
    ) {
      const leaf = toLeafInputValue(currentValue as JsonPrimitive | undefined);
      return (
        <Field
          key={currentLabel}
          label={currentLabel}
          type={leaf.type}
          value={leaf.value}
          readOnly={readOnly}
          onChange={(next) => {
            if (readOnly) return;
            onChange?.(
              path,
              next === '' ? null : (next as string | number | boolean)
            );
          }}
        />
      );
    }

    if (Array.isArray(currentValue)) {
      return currentValue.length === 0 ? (
        <Field
          key={currentLabel}
          label={currentLabel}
          value="[]"
          readOnly={true}
        />
      ) : (
        currentValue.map((item, index) =>
          render(`${currentLabel}[${index}]`, item, depth + 1, [...path, index])
        )
      );
    }

    if (isPlainObject(currentValue)) {
      const entries = Object.entries(currentValue);
      return entries.length === 0 ? (
        <Field
          key={currentLabel}
          label={currentLabel}
          value="{}"
          readOnly={true}
        />
      ) : (
        entries.map(([key, val]) =>
          render(`${currentLabel}.${key}`, val, depth + 1, [...path, key])
        )
      );
    }

    return (
      <Field
        key={currentLabel}
        label={currentLabel}
        value={JSON.stringify(currentValue)}
        readOnly={true}
      />
    );
  };

  return <>{render(label, value as JsonValue, 0, [])}</>;
}

export function PropertiesPanel() {
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);
  const tracks = useDocStore((state) => state.tracks);
  const updateClipInTrack = useDocStore((state) => state.updateClip);

  const selectedClipId = selectedClipIds[0];
  if (!selectedClipId) {
    return <div />;
  }

  const result = findClipInTracks(tracks, selectedClipId);
  if (!result) {
    return <div>Clip not found</div>;
  }

  const { clip, trackId } = result;
  const videoClip = clip.type !== 'audio' ? (clip as IGraphicClip) : null;
  const updateClip = (updates: Partial<IClip>) => {
    updateClipInTrack(trackId, clip.id, updates);
  };

  return (
    <div className="p-2 flex flex-col gap-4 h-full overflow-y-auto">
      <Field label="trackId" value={trackId} readOnly={true} />
      <Field label="id" value={clip.id} readOnly={true} />
      <Field label="type" value={clip.type} readOnly={true} />
      <Field
        label="name"
        value={clip.name}
        onChange={(next) => updateClip({ name: String(next) })}
      />
      <Field
        label="startTime"
        type="number"
        value={clip.startTime}
        onChange={(next) => updateClip({ startTime: Number(next) })}
      />
      <Field
        label="endTime"
        type="number"
        value={clip.endTime}
        onChange={(next) => updateClip({ endTime: Number(next) })}
      />

      {'assetId' in clip && (
        <Field
          label="assetId"
          value={clip.assetId}
          onChange={(next) => updateClip({ assetId: String(next) } as any)}
        />
      )}
      {'trimStart' in clip && (
        <Field
          label="trimStart"
          type="number"
          value={clip.trimStart ?? 0}
          onChange={(next) =>
            updateClip({
              trimStart: next === '' ? undefined : Number(next),
            } as any)
          }
        />
      )}
      {'trimEnd' in clip && (
        <Field
          label="trimEnd"
          type="number"
          value={clip.trimEnd ?? 0}
          onChange={(next) =>
            updateClip({
              trimEnd: next === '' ? undefined : Number(next),
            } as any)
          }
        />
      )}
      {'volume' in clip && (
        <Field
          label="volume"
          type="number"
          value={clip.volume ?? 0}
          onChange={(next) => updateClip({ volume: Number(next) } as any)}
        />
      )}

      {videoClip && (
        <ObjectFieldInputs
          label="transforms"
          value={videoClip.transforms}
          readOnly={false}
          onChange={(path, next) => {
            const nextTransforms = setAtPath(videoClip.transforms, path, next);
            updateClip({ transforms: nextTransforms } as any);
          }}
        />
      )}
    </div>
  );
}
