import { describe, expect, it } from 'vitest';
import {
  computeNextProjectDurationMs,
  getMaxClipEndTimeMs,
} from './projectDuration';

describe('projectDuration', () => {
  it('getMaxClipEndTimeMs returns 0 for empty tracks', () => {
    expect(getMaxClipEndTimeMs([] as any)).toBe(0);
    expect(getMaxClipEndTimeMs([{ clips: [] }] as any)).toBe(0);
  });

  it('getMaxClipEndTimeMs returns the maximum endTime across all tracks', () => {
    const tracks = [
      { clips: [{ endTime: 1000 }, { endTime: 9000 }] },
      { clips: [{ endTime: 5000 }] },
    ] as any;

    expect(getMaxClipEndTimeMs(tracks)).toBe(9000);
  });

  it('computeNextProjectDurationMs does nothing when disabled', () => {
    const tracks = [{ clips: [{ endTime: 70000 }] }] as any;
    expect(
      computeNextProjectDurationMs({
        enabled: false,
        currentDurationMs: 60000,
        tracks,
      })
    ).toBe(60000);
  });

  it('computeNextProjectDurationMs extends when max endTime exceeds duration', () => {
    const tracks = [{ clips: [{ endTime: 70000 }] }] as any;
    expect(
      computeNextProjectDurationMs({
        enabled: true,
        currentDurationMs: 60000,
        tracks,
      })
    ).toBe(70000);
  });

  it('computeNextProjectDurationMs keeps duration when already long enough', () => {
    const tracks = [{ clips: [{ endTime: 50000 }] }] as any;
    expect(
      computeNextProjectDurationMs({
        enabled: true,
        currentDurationMs: 60000,
        tracks,
      })
    ).toBe(60000);
  });
});
