import * as react from 'react';
import {
  Ellipsis,
  Eye,
  LockKeyhole,
  type LucideProps,
  VolumeOff,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { ITrack } from '@renderer/lib/studio/types';
import { useState } from 'react';
import { Clip } from '@renderer/lib/studio/components/Track/Clip';

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

export function Track({ track }: { track: ITrack }) {
  const [active, setActive] = useState(false);
  return (
    <div className={'h-[60px] bg-neutral-850 flex gap-0.5'}>
      <div
        className={
          'w-[120px] bg-neutral-800 shrink-0 flex items-center justify-center gap-1.5'
        }
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

      <div className={'bg-neutral-800 flex-1'}>
        {track.clips.map((clip) => (
          <Clip key={clip.id} clip={clip} />
        ))}
      </div>
    </div>
  );
}
