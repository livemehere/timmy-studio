import { useCallback } from 'react';
import { toast } from 'sonner';
import type { IClip } from '../../Clip/types';

type SelectedClipData = {
  clip: IClip;
  trackId: string;
  startTime: number;
};

function collectSelectedClips(
  selectedIds: string[],
  tracks: Array<{ id: string; clips: IClip[] }>
): SelectedClipData[] {
  const selected: SelectedClipData[] = [];

  selectedIds.forEach((selectedId) => {
    const trackWithClip = tracks.find((track) =>
      track.clips.some((c) => c.id === selectedId)
    );

    if (!trackWithClip) return;

    const foundClip = trackWithClip.clips.find((c) => c.id === selectedId);
    if (!foundClip) return;

    selected.push({
      clip: JSON.parse(JSON.stringify(foundClip)),
      trackId: trackWithClip.id,
      startTime: foundClip.startTime,
    });
  });

  return selected;
}

function toClipboardPayload(selected: SelectedClipData[]) {
  if (selected.length === 0) return null;

  const minStartTime = Math.min(...selected.map((d) => d.startTime));
  return selected.map((d) => ({
    clip: d.clip,
    trackId: d.trackId,
    relativeStartTime: d.startTime - minStartTime,
  }));
}

export function useClipContextActions({
  clip,
  trackId,
  selectedClipIds,
  tracks,
  setClipboard,
  removeClip,
  updateClip,
  cloneClipToTrack,
  setSelectedClipIds,
}: {
  clip: IClip;
  trackId: string;
  selectedClipIds: string[];
  tracks: Array<{ id: string; clips: IClip[] }>;
  setClipboard: (payload: {
    clips: Array<{ clip: IClip; trackId: string; relativeStartTime: number }>;
    operation: 'copy' | 'cut';
  }) => void;
  removeClip: (trackId: string, clipId: string) => void;
  updateClip: (
    trackId: string,
    clipId: string,
    partial: Partial<IClip>
  ) => void;
  cloneClipToTrack: (
    fromTrackId: string,
    toTrackId: string,
    clipId: string,
    startTime: number,
    endTime: number
  ) => string | null | undefined;
  setSelectedClipIds: (clipIds: string[]) => void;
}) {
  const handleCopy = useCallback(() => {
    // 선택된 클립이 여러 개인 경우
    if (selectedClipIds.length > 1) {
      const clipDataArray = collectSelectedClips(selectedClipIds, tracks);
      const clipsWithRelativeTime = toClipboardPayload(clipDataArray);

      if (clipsWithRelativeTime) {
        setClipboard({
          clips: clipsWithRelativeTime,
          operation: 'copy',
        });

        console.log('[TimelineClip] Copied clips:', clipDataArray.length);
        toast.success(`${clipDataArray.length} clips copied`, {
          description: 'Press ⌘V to paste',
        });
      }
    } else {
      // 단일 클립 복사
      const clipData = JSON.parse(JSON.stringify(clip));
      setClipboard({
        clips: [
          {
            clip: clipData,
            trackId: trackId,
            relativeStartTime: 0,
          },
        ],
        operation: 'copy',
      });
      console.log('[TimelineClip] Copied clip data:', clip.id);
      toast.success('Clip copied', { description: 'Press ⌘V to paste' });
    }
  }, [clip, selectedClipIds, setClipboard, trackId, tracks]);

  const handleCut = useCallback(() => {
    // 선택된 클립이 여러 개인 경우
    if (selectedClipIds.length > 1) {
      const clipDataArray = collectSelectedClips(selectedClipIds, tracks);
      const clipsWithRelativeTime = toClipboardPayload(clipDataArray);

      if (clipsWithRelativeTime) {
        setClipboard({
          clips: clipsWithRelativeTime,
          operation: 'cut',
        });

        // Cut은 즉시 원본 삭제
        clipDataArray.forEach((d) => removeClip(d.trackId, d.clip.id));

        console.log('[TimelineClip] Cut clips:', clipDataArray.length);
        toast.info(`${clipDataArray.length} clips cut`, {
          description: 'Press ⌘V to paste',
        });
      }
    } else {
      // 단일 클립 잘라내기
      const clipData = JSON.parse(JSON.stringify(clip));
      setClipboard({
        clips: [
          {
            clip: clipData,
            trackId: trackId,
            relativeStartTime: 0,
          },
        ],
        operation: 'cut',
      });
      // Cut은 즉시 원본 삭제
      removeClip(trackId, clip.id);
      console.log('[TimelineClip] Cut (removed) and saved data:', clip.id);
      toast.info('Clip cut', { description: 'Press ⌘V to paste' });
    }
  }, [clip, removeClip, selectedClipIds, setClipboard, trackId, tracks]);

  const handleDuplicate = useCallback(() => {
    const newStartTime = clip.endTime;
    const newEndTime = newStartTime + (clip.endTime - clip.startTime);

    try {
      const newClipId = cloneClipToTrack(
        trackId,
        trackId,
        clip.id,
        newStartTime,
        newEndTime
      );

      if (newClipId) {
        setSelectedClipIds([newClipId]);
        console.log('[TimelineClip] Duplicated:', newClipId);
      }
    } catch (error) {
      console.error('[TimelineClip] Duplicate failed:', error);
    }
  }, [
    clip.endTime,
    clip.id,
    clip.startTime,
    cloneClipToTrack,
    setSelectedClipIds,
    trackId,
  ]);

  const handleDelete = useCallback(() => {
    removeClip(trackId, clip.id);
    console.log('[TimelineClip] Deleted:', clip.id);
  }, [clip.id, removeClip, trackId]);

  const handleToggleLock = useCallback(() => {
    updateClip(trackId, clip.id, {
      locked: !clip.locked,
    });
    console.log('[TimelineClip] Toggled lock:', clip.id, !clip.locked);
  }, [clip.id, clip.locked, trackId, updateClip]);

  const handleToggleVisibility = useCallback(() => {
    updateClip(trackId, clip.id, {
      enabled: !clip.enabled,
    });
    console.log('[TimelineClip] Toggled visibility:', clip.id, !clip.enabled);
  }, [clip.enabled, clip.id, trackId, updateClip]);

  return {
    handleCopy,
    handleCut,
    handleDuplicate,
    handleDelete,
    handleToggleLock,
    handleToggleVisibility,
  };
}
