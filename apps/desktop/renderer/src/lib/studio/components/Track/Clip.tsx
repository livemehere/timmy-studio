import { useClip } from '@renderer/lib/studio/contexts/StudioProvider';

export function Clip({ clipId }: { clipId: string }) {
  const clip = useClip(clipId);
  if (!clip) {
    throw new Error(`Clip(${clipId}) not found`);
  }
  return (
    <div className="inline-block h-full bg-cyan-700 px-2 py-1 rounded">
      {clip.name}
    </div>
  );
}
