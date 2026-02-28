import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import type { RefObject } from 'react';
import { useDocStore, useInteractionStore } from './useStudioStores';
import {
  findTrackByClipId,
  hasOverlap,
  collectClipboardItems,
} from '../utils/trackHelpers';
import {
  extractClipStyle,
  applyClipStyle,
  getStyleLabel,
  extractPosition,
  applyPosition,
} from '../utils/clipStyleUtils';
import type { IGraphicClip } from '../domains/Clip/types';

/**
 * TimelinePanel에서 사용하는 모든 키보드 단축키 로직을 모은 훅.
 */
export function useTimelineHotkeys(
  timelinePanelRef: RefObject<HTMLDivElement | null>
) {
  // --- store selectors ---
  const tracks = useDocStore((s) => s.tracks);
  const removeClip = useDocStore((s) => s.removeClip);
  const cloneClipToTrack = useDocStore((s) => s.cloneClipToTrack);
  const addClipToTrack = useDocStore((s) => s.addClipToTrack);

  const selectedClipIds = useInteractionStore((s) => s.selectedClipIds);
  const setSelectedClipId = useInteractionStore((s) => s.setSelectedClipId);
  const setSelectedClipIds = useInteractionStore((s) => s.setSelectedClipIds);
  const setActiveTrackId = useInteractionStore((s) => s.setActiveTrackId);
  const clipboard = useInteractionStore((s) => s.clipboard);
  const setClipboard = useInteractionStore((s) => s.setClipboard);
  const styleClipboard = useInteractionStore((s) => s.styleClipboard);
  const setStyleClipboard = useInteractionStore((s) => s.setStyleClipboard);
  const positionClipboard = useInteractionStore((s) => s.positionClipboard);
  const setPositionClipboard = useInteractionStore(
    (s) => s.setPositionClipboard
  );
  const updateClip = useDocStore((s) => s.updateClip);
  const lastClickedTime = useInteractionStore((s) => s.lastClickedTime);
  const activeTrackId = useInteractionStore((s) => s.activeTrackId);

  // ── Delete ──────────────────────────────────────────
  useHotkeys('backspace, delete', () => {
    if (selectedClipIds.length === 0) return;

    selectedClipIds.forEach((clipId) => {
      const track = findTrackByClipId(tracks, clipId);
      if (track) removeClip(track.id, clipId);
    });

    setSelectedClipId(null);
  });

  // ── Select All ──────────────────────────────────────
  useHotkeys(
    'mod+a',
    (e) => {
      if (
        !timelinePanelRef.current ||
        !timelinePanelRef.current.contains(document.activeElement)
      ) {
        return;
      }
      e.preventDefault();

      const allClipIds = tracks.flatMap((track) =>
        track.clips.map((clip) => clip.id)
      );
      setSelectedClipIds(allClipIds);
    },
    { enableOnFormTags: true }
  );

  // ── Escape ──────────────────────────────────────────
  useHotkeys('escape', () => {
    setSelectedClipIds([]);
    setActiveTrackId(null);
  });

  // ── Copy / Cut (공통) ─────────────────────────────────
  const handleCopyOrCut = (operation: 'copy' | 'cut') => {
    if (selectedClipIds.length === 0) return;

    const items = collectClipboardItems(tracks, selectedClipIds);
    if (items.length === 0) return;

    setClipboard({ clips: items, operation });

    if (operation === 'cut') {
      items.forEach((item) => removeClip(item.trackId, item.clip.id));
    }

    const count = items.length;
    const label = operation === 'copy' ? 'copied' : 'cut';
    const toastFn = operation === 'copy' ? toast.success : toast.info;
    toastFn(count === 1 ? `Clip ${label}` : `${count} clips ${label}`, {
      description: 'Press ⌘V to paste',
    });
  };

  useHotkeys('mod+c', (e) => {
    e.preventDefault();
    handleCopyOrCut('copy');
  });

  useHotkeys('mod+x', (e) => {
    e.preventDefault();
    handleCopyOrCut('cut');
  });

  // ── Paste ───────────────────────────────────────────
  useHotkeys('mod+v', (e) => {
    e.preventDefault();
    if (!clipboard) return;

    const pasteStartTime = lastClickedTime ?? 0;

    // 단일 클립 → activeTrack에
    if (clipboard.clips.length === 1) {
      if (!activeTrackId) return;

      const targetTrack = tracks.find((t) => t.id === activeTrackId);
      if (!targetTrack) return;

      const { clip } = clipboard.clips[0];
      const duration = clip.endTime - clip.startTime;
      const newStartTime = pasteStartTime;
      const newEndTime = newStartTime + duration;

      if (hasOverlap(targetTrack, newStartTime, newEndTime)) {
        toast.error('Cannot paste', {
          description: 'Clip would overlap with existing clip',
        });
        return;
      }

      addClipToTrack(activeTrackId, {
        ...clip,
        startTime: newStartTime,
        endTime: newEndTime,
      });
      toast.success('Clip pasted');
      return;
    }

    // 다중 클립 → 각 원본 트랙에
    const newClips = clipboard.clips.map((item) => {
      const duration = item.clip.endTime - item.clip.startTime;
      const newStartTime = pasteStartTime + item.relativeStartTime;
      const newEndTime = newStartTime + duration;
      return {
        trackId: item.trackId,
        clipData: {
          ...item.clip,
          startTime: newStartTime,
          endTime: newEndTime,
        },
        newStartTime,
        newEndTime,
      };
    });

    // 겹침 체크
    for (const nc of newClips) {
      const targetTrack = tracks.find((t) => t.id === nc.trackId);
      if (!targetTrack) {
        toast.error('Cannot paste', {
          description: 'Original track not found',
        });
        return;
      }
      if (hasOverlap(targetTrack, nc.newStartTime, nc.newEndTime)) {
        toast.error('Cannot paste', {
          description: 'Clips would overlap with existing clips',
        });
        return;
      }
    }

    newClips.forEach((nc) => addClipToTrack(nc.trackId, nc.clipData));
    toast.success(`${newClips.length} clips pasted`);
  });

  // ── Duplicate ───────────────────────────────────────
  useHotkeys('mod+d', (e) => {
    e.preventDefault();
    if (selectedClipIds.length === 0) return;

    const newClipIds: string[] = [];

    selectedClipIds.forEach((clipId) => {
      const track = findTrackByClipId(tracks, clipId);
      if (!track) return;

      const original = track.clips.find((c) => c.id === clipId);
      if (!original) return;

      const newStartTime = original.endTime;
      const duration = original.endTime - original.startTime;
      const newEndTime = newStartTime + duration;

      if (hasOverlap(track, newStartTime, newEndTime, clipId)) {
        console.error(
          `[TimelinePanel] Cannot duplicate: overlaps on track ${track.id}`
        );
        return;
      }

      const newClipId = cloneClipToTrack(
        track.id,
        track.id,
        clipId,
        newStartTime,
        newEndTime
      );
      if (newClipId) newClipIds.push(newClipId);
    });

    if (newClipIds.length > 0) {
      setSelectedClipIds(newClipIds);
    }
  });

  // ── Copy Style ─────────────────────────────────────
  useHotkeys('mod+shift+c', (e) => {
    e.preventDefault();
    if (selectedClipIds.length !== 1) return;

    const clipId = selectedClipIds[0];
    const track = findTrackByClipId(tracks, clipId);
    if (!track) return;

    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return;

    const style = extractClipStyle(clip);
    setStyleClipboard({
      sourceType: clip.type,
      style: style as unknown as Record<string, unknown>,
    });

    const label = getStyleLabel(clip.type);
    toast.success(`${label} copied`, {
      description: 'Press ⌘⇧V to paste style',
    });
  });

  // ── Paste Style ────────────────────────────────────
  useHotkeys('mod+shift+v', (e) => {
    e.preventDefault();
    if (!styleClipboard || selectedClipIds.length === 0) return;

    let appliedCount = 0;
    selectedClipIds.forEach((clipId) => {
      const track = findTrackByClipId(tracks, clipId);
      if (!track) return;

      const clip = track.clips.find((c) => c.id === clipId);
      if (!clip) return;

      const updates = applyClipStyle(clip, styleClipboard.style as any);
      if (updates) {
        updateClip(track.id, clipId, updates);
        appliedCount++;
      }
    });

    if (appliedCount > 0) {
      toast.success(
        appliedCount === 1
          ? 'Style applied'
          : `Style applied to ${appliedCount} clips`
      );
    } else {
      toast.error('Cannot paste style', {
        description: 'Incompatible clip types',
      });
    }
  });

  // ── Copy Position ──────────────────────────────────
  useHotkeys('mod+alt+c', (e) => {
    e.preventDefault();
    if (selectedClipIds.length !== 1) return;

    const clipId = selectedClipIds[0];
    const track = findTrackByClipId(tracks, clipId);
    if (!track) return;

    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip || clip.type === 'audio') return;

    const pos = extractPosition(clip as IGraphicClip);
    setPositionClipboard(pos);
    toast.success('Position copied', {
      description: 'Press ⌘⌥V to paste position',
    });
  });

  // ── Paste Position ─────────────────────────────────
  useHotkeys('mod+alt+v', (e) => {
    e.preventDefault();
    if (!positionClipboard || selectedClipIds.length === 0) return;

    let appliedCount = 0;
    selectedClipIds.forEach((clipId) => {
      const track = findTrackByClipId(tracks, clipId);
      if (!track) return;

      const clip = track.clips.find((c) => c.id === clipId);
      if (!clip || clip.type === 'audio') return;

      const updates = applyPosition(clip as IGraphicClip, positionClipboard);
      updateClip(track.id, clipId, updates);
      appliedCount++;
    });

    if (appliedCount > 0) {
      toast.success(
        appliedCount === 1
          ? 'Position applied'
          : `Position applied to ${appliedCount} clips`
      );
    }
  });
}
