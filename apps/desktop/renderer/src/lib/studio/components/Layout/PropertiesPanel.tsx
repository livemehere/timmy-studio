import { useDocStore, useInteractionStore } from '../../hooks/useStudioStores';
import type { IClip, ITrack, IVideoClip } from '../../types/types';
import type { ReactNode } from 'react';

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

function ReadonlyField({
  label,
  value,
  type = 'text',
}: {
  label: string;
  value: string | number;
  type?: 'text' | 'number';
}) {
  return (
    <label className="flex items-center gap-2">
      <div className="min-w-[120px] shrink-0">{label}</div>
      <input
        readOnly
        type={type}
        value={value}
        className="bg-neutral-800 py-1 px-2 roudned"
      />
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
  type: 'text' | 'number';
  value: string | number;
} {
  if (typeof value === 'number') return { type: 'number', value };
  if (typeof value === 'string') return { type: 'text', value };
  if (typeof value === 'boolean') return { type: 'text', value: String(value) };
  if (value === null) return { type: 'text', value: 'null' };
  return { type: 'text', value: '' };
}

function ObjectFieldInputs({
  label,
  value,
  maxDepth = 5,
}: {
  label: string;
  value: unknown;
  maxDepth?: number;
}) {
  const render = (
    currentLabel: string,
    currentValue: unknown,
    depth: number
  ): ReactNode => {
    if (depth > maxDepth) {
      return (
        <ReadonlyField
          key={currentLabel}
          label={currentLabel}
          value={JSON.stringify(currentValue)}
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
        <ReadonlyField
          key={currentLabel}
          label={currentLabel}
          type={leaf.type}
          value={leaf.value}
        />
      );
    }

    if (Array.isArray(currentValue)) {
      return currentValue.length === 0 ? (
        <ReadonlyField key={currentLabel} label={currentLabel} value="[]" />
      ) : (
        currentValue.map((item, index) =>
          render(`${currentLabel}[${index}]`, item, depth + 1)
        )
      );
    }

    if (isPlainObject(currentValue)) {
      const entries = Object.entries(currentValue);
      return entries.length === 0 ? (
        <ReadonlyField key={currentLabel} label={currentLabel} value="{}" />
      ) : (
        entries.map(([key, val]) =>
          render(`${currentLabel}.${key}`, val, depth + 1)
        )
      );
    }

    return (
      <ReadonlyField
        key={currentLabel}
        label={currentLabel}
        value={JSON.stringify(currentValue)}
      />
    );
  };

  return <>{render(label, value as JsonValue, 0)}</>;
}

export function PropertiesPanel() {
  const selectedClipIds = useInteractionStore((state) => state.selectedClipIds);
  const tracks = useDocStore((state) => state.tracks);

  const selectedClipId = selectedClipIds[0];
  if (!selectedClipId) {
    return <div />;
  }

  const result = findClipInTracks(tracks, selectedClipId);
  if (!result) {
    return <div>Clip not found</div>;
  }

  const { clip, trackId } = result;
  const videoClip = clip.type !== 'audio' ? (clip as IVideoClip) : null;

  return (
    <div className="p-2 flex flex-col gap-4 h-full overflow-y-auto">
      <ReadonlyField label="trackId" value={trackId} />
      <ReadonlyField label="id" value={clip.id} />
      <ReadonlyField label="type" value={clip.type} />
      <ReadonlyField label="name" value={clip.name} />
      <ReadonlyField label="startTime" type="number" value={clip.startTime} />
      <ReadonlyField label="endTime" type="number" value={clip.endTime} />

      {'assetId' in clip && (
        <ReadonlyField label="assetId" value={clip.assetId} />
      )}
      {'trimStart' in clip && (
        <ReadonlyField
          label="trimStart"
          type="number"
          value={clip.trimStart ?? 0}
        />
      )}
      {'trimEnd' in clip && (
        <ReadonlyField
          label="trimEnd"
          type="number"
          value={clip.trimEnd ?? 0}
        />
      )}
      {'volume' in clip && (
        <ReadonlyField label="volume" type="number" value={clip.volume ?? 0} />
      )}

      {videoClip && (
        <ObjectFieldInputs label="transforms" value={videoClip.transforms} />
      )}
    </div>
  );
}
