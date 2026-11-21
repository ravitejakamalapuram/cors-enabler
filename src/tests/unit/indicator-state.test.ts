import { describe, expect, it } from 'vitest';
import { shouldShowIndicator } from '@/content/indicator-state';
import { STORAGE_KEYS } from '@/shared/constants';

describe('shouldShowIndicator', () => {
  it('shows while enabled with default settings', () => {
    expect(shouldShowIndicator({ [STORAGE_KEYS.enabled]: true })).toBe(true);
  });

  it('hides when disabled or the flag is missing', () => {
    expect(shouldShowIndicator({ [STORAGE_KEYS.enabled]: false })).toBe(false);
    expect(shouldShowIndicator({})).toBe(false);
  });

  it('hides when the user turned the page indicator off', () => {
    expect(
      shouldShowIndicator({
        [STORAGE_KEYS.enabled]: true,
        [STORAGE_KEYS.settings]: { showPageIndicator: false },
      }),
    ).toBe(false);
  });
});
