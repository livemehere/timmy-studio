import type { IAudioClip, IVideoClip } from '@renderer/lib/studio/types';

export function Clip({ clip }: { clip: IVideoClip | IAudioClip }) {
  return (
    <div className="inline-block h-full bg-blue-600  px-2 py-1 rounded">
      {clip.name}
    </div>
  );
}
