import { describe, expect, it } from 'vitest';
import {
  didClipBecomeVisible,
  shouldStartVideoPlayback,
} from '@renderer/lib/studio/utils/playbackGuards';

describe('playbackGuards', () => {
  describe('didClipBecomeVisible', () => {
    it('returns true only on false -> true transition', () => {
      expect(didClipBecomeVisible({ wasVisible: false, isVisible: true })).toBe(
        true
      );
      expect(didClipBecomeVisible({ wasVisible: true, isVisible: true })).toBe(
        false
      );
      expect(
        didClipBecomeVisible({ wasVisible: false, isVisible: false })
      ).toBe(false);
      expect(didClipBecomeVisible({ wasVisible: true, isVisible: false })).toBe(
        false
      );
    });
  });

  describe('shouldStartVideoPlayback', () => {
    it('starts when play state changed', () => {
      expect(
        shouldStartVideoPlayback({
          playStateChanged: true,
          clipBecameVisible: false,
        })
      ).toBe(true);
    });

    it('starts when clip just became visible during playing', () => {
      expect(
        shouldStartVideoPlayback({
          playStateChanged: false,
          clipBecameVisible: true,
        })
      ).toBe(true);
    });

    it('does not start otherwise', () => {
      expect(
        shouldStartVideoPlayback({
          playStateChanged: false,
          clipBecameVisible: false,
        })
      ).toBe(false);
    });
  });
});
