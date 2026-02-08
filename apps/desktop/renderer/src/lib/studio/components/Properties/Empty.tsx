import { Settings2 } from 'lucide-react';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

export function Empty() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-neutral-500">
      <div className="w-16 h-16 rounded-2xl bg-neutral-800/30 flex items-center justify-center">
        <Settings2 size={28} className="text-neutral-600" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-neutral-400">Select a clip</p>
        <p className="text-xs text-neutral-500 mt-1">
          Select or drag a clip from the timeline
        </p>
      </div>
      <div className="flex flex-col items-center gap-1 text-[10px] text-neutral-600 mt-2">
        <span className="flex items-center gap-1.5">
          <Kbd className="px-1.5 rounded">Click</Kbd>
          Select clip
        </span>
        <span className="flex items-center gap-1.5">
          <KbdGroup>
            <Kbd className="px-1.5 rounded">Shift</Kbd>+
            <Kbd className="px-1.5 rounded">Click</Kbd>
          </KbdGroup>
          Multi-select
        </span>
      </div>
    </div>
  );
}
