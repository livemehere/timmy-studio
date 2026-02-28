import type { MotionValue } from 'motion/react';

/**
 * 타임라인 클립의 MotionValue를 모듈 스코프에서 관리하는 레지스트리.
 * React 상태/store 를 거치지 않고 leader ↔ follower 간 MotionValue를 공유한다.
 *
 * 각 TimelineClip이 mount 시 register, unmount 시 unregister 한다.
 */

interface ClipMotionEntry {
  motionX: MotionValue<number>;
  trackId: string;
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
