import isEqual from 'fast-deep-equal';

type Key = string | number;

export interface DeepDiffResult<T> {
  added: T[];
  removed: T[];
  updated: T[];
}

/**
 * Deep diff two arrays by stable key (default: item.id).
 *
 * - added: in next, not in prev
 * - removed: in prev, not in next
 * - updated: same key exists in both but deep-not-equal
 *
 * Big-lib style notes:
 *  - O(n) using hash maps
 *  - tolerates duplicates by key: treats later item as last-write-wins
 *  - if key missing/invalid, falls back to deep compare bucket
 */
export function deepDiffArrays<T extends Record<string, any>>(
  prev: readonly T[] = [],
  next: readonly T[] = [],
  options?: {
    keySelector?: (item: T) => Key | undefined | null;
    compareFn?: (a: T, b: T) => boolean; // return true if equal
  }
): DeepDiffResult<T> {
  const keySelector =
    options?.keySelector ?? ((item: T) => (item as any).id as Key | undefined);
  const compareFn = options?.compareFn ?? isEqual;

  const prevMap = new Map<Key, T>();
  const nextMap = new Map<Key, T>();

  const prevNoKey: T[] = [];
  const nextNoKey: T[] = [];

  // build prev map
  for (const item of prev) {
    const key = keySelector(item);
    if (key === undefined || key === null) {
      prevNoKey.push(item);
    } else {
      prevMap.set(key, item);
    }
  }

  // build next map
  for (const item of next) {
    const key = keySelector(item);
    if (key === undefined || key === null) {
      nextNoKey.push(item);
    } else {
      nextMap.set(key, item);
    }
  }

  const added: T[] = [];
  const removed: T[] = [];
  const updated: T[] = [];

  // removed + updated check
  for (const [key, prevItem] of prevMap) {
    const nextItem = nextMap.get(key);
    if (!nextItem) {
      removed.push(prevItem);
    } else if (!compareFn(prevItem, nextItem)) {
      // NOTE: return the "next" version as updated (typical sync semantics)
      updated.push(nextItem);
    }
  }

  // added check
  for (const [key, nextItem] of nextMap) {
    if (!prevMap.has(key)) {
      added.push(nextItem);
    }
  }

  /**
   * Fallback for items without keys:
   * We try to match by deep-equality to avoid false added/removed.
   * This is O(m^2) on no-key items but those should be rare.
   */
  if (prevNoKey.length || nextNoKey.length) {
    const usedPrev = new Set<number>();

    for (const nItem of nextNoKey) {
      let matchedIndex = -1;
      for (let i = 0; i < prevNoKey.length; i++) {
        if (usedPrev.has(i)) continue;
        if (compareFn(prevNoKey[i], nItem)) {
          matchedIndex = i;
          break;
        }
      }
      if (matchedIndex >= 0) {
        usedPrev.add(matchedIndex);
        // deep equal이므로 변화 없음으로 간주
      } else {
        added.push(nItem);
      }
    }

    for (let i = 0; i < prevNoKey.length; i++) {
      if (!usedPrev.has(i)) removed.push(prevNoKey[i]);
    }
  }

  return { added, removed, updated };
}
