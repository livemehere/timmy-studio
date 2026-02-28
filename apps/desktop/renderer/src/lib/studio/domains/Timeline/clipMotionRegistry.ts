import type { MotionValue } from 'motion/react';

/**
 * 타임라인 클립의 MotionValue를 모듈 스코프에서 관리하는 레지스트리.
 * React 상태/store 를 거치지 않고 leader ↔ follower 간 MotionValue를 공유한다.
 *
 * 각 TimelineClip이 mount 시 register, unmount 시 unregister 한다.
 */

/** Properties 패널 등에서 드래그 중 실시간 프리뷰를 위한 상태 */
export interface ClipPreviewState {
  startTime?: number;
  endTime?: number;
  trimStart?: number;
  trimEnd?: number;
}

interface ClipMotionEntry {
  motionX: MotionValue<number>;
  trackId: string;
  /** 외부에서 localDragState를 설정하여 타임라인 클립의 실시간 프리뷰를 제어 */
  setPreview?: (state: ClipPreviewState | null) => void;
}

const registry = new Map<string, ClipMotionEntry>();

export function registerClipMotion(
  clipId: string,
  motionX: MotionValue<number>,
  trackId: string
) {
  registry.set(clipId, { motionX, trackId });
}

export function unregisterClipMotion(clipId: string) {
  registry.delete(clipId);
}

export function getClipMotion(clipId: string): ClipMotionEntry | undefined {
  return registry.get(clipId);
}

export function getClipMotions(
  clipIds: string[]
): Map<string, ClipMotionEntry> {
  const result = new Map<string, ClipMotionEntry>();
  for (const id of clipIds) {
    const entry = registry.get(id);
    if (entry) result.set(id, entry);
  }
  return result;
}

/**
 * 특정 클립의 setPreview 콜백을 등록한다.
 * TimelineClip의 useTimelineClipDrag 내부에서 호출된다.
 */
export function registerClipPreview(
  clipId: string,
  setPreview: (state: ClipPreviewState | null) => void
) {
  const entry = registry.get(clipId);
  if (entry) {
    entry.setPreview = setPreview;
  }
}

export function unregisterClipPreview(clipId: string) {
  const entry = registry.get(clipId);
  if (entry) {
    entry.setPreview = undefined;
  }
}

/**
 * 외부(Properties 패널 등)에서 특정 클립의 실시간 프리뷰 상태를 설정한다.
 * clipMotionRegistry에 등록된 setPreview 콜백을 통해 localDragState를 조작한다.
 */
export function setClipPreview(clipId: string, state: ClipPreviewState | null) {
  const entry = registry.get(clipId);
  entry?.setPreview?.(state);
}
