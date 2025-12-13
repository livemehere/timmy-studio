import * as react from 'react';
import {
  Ellipsis,
  Eye,
  LockKeyhole,
  type LucideProps,
  VolumeOff,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { useState } from 'react';
import { TimelineItem } from '@renderer/lib/studio/components/Timeline/TimelineItem';
import { useDocStore } from '../../hooks/useStudioStores';

function TrackButton({
  icon: IconComp,
  active,
  onClick,
}: {
  icon: react.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & react.RefAttributes<SVGSVGElement>
  >;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn('hover:bg-neutral-700 p-1 rounded')}
      onClick={onClick}
    >
      <IconComp size={14} color={active ? 'dodgerblue' : undefined} />
    </button>
  );
}

export function TimelineTrack({
  trackId,
  trackTitleWidth,
  trackHeight,
  pxPerSec,
}: {
  trackId: string;
  trackTitleWidth: number;
  trackHeight: number;
  pxPerSec: number;
}) {
  const track = useDocStore((state) =>
    state.tracks.find((t) => t.id === trackId)
  );
  if (!track) {
    throw new Error(`Track(${trackId}) not found`);
  }
  const [active, setActive] = useState(false);
  return (
    <div
      style={{
        height: trackHeight,
      }}
      className={'bg-neutral-850 flex'}
    >
      <div
        className={
          'sticky left-0 z-50 bg-neutral-800 shrink-0 flex items-center justify-center gap-1.5'
        }
        style={{ width: trackTitleWidth }}
      >
        <TrackButton
          icon={LockKeyhole}
          active={active}
          onClick={() => setActive(!active)}
        />
        <TrackButton icon={Eye} />
        <TrackButton icon={VolumeOff} />
        <TrackButton icon={Ellipsis} />
      </div>

      <div className={'bg-neutral-800 flex-1 relative'}>
        {track.clips.map((clip) => (
          <TimelineItem
            key={clip.id}
            trackId={track.id}
            clipId={clip.id}
            pxPerSec={pxPerSec}
          />
        ))}
      </div>
    </div>
  );
}
