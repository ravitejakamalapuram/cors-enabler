import { describe, expect, it } from 'vitest';
import { badgeFor } from '@/background/badge';

describe('badgeFor', () => {
  it('shows an ON badge with an explanatory tooltip when enabled', () => {
    const view = badgeFor(true);
    expect(view.text).toBe('ON');
    expect(view.title).toMatch(/ON/);
  });

  it('clears the badge text when disabled', () => {
    const view = badgeFor(false);
    expect(view.text).toBe('');
    expect(view.title).toMatch(/off/);
  });
});
