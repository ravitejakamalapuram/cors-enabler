import { describe, expect, it } from 'vitest';
import { badgeFor } from '@/background/badge';
import { isAllowedFromSender } from '@/background/message-handler';
import { indicatorView } from '@/shared/indicator';

const on = { showPageIndicator: true };

describe('indicatorView', () => {
  it('shows ON and the pill only when enabled and rules are installed', () => {
    expect(indicatorView({ enabled: true, state: 'ENABLED', settings: on })).toEqual({
      badge: 'on',
      pill: true,
    });
  });

  it('shows an error badge, not ON, when re-install failed with enabled still true', () => {
    expect(indicatorView({ enabled: true, state: 'ERROR', settings: on })).toEqual({
      badge: 'error',
      pill: false,
    });
  });

  it('stays off while disabled or mid-transition', () => {
    expect(indicatorView({ enabled: false, state: 'DISABLED', settings: on }).badge).toBe('off');
    expect(indicatorView({ enabled: false, state: 'ENABLING', settings: on }).badge).toBe('off');
  });

  it('hides only the pill when the page indicator setting is off', () => {
    expect(
      indicatorView({ enabled: true, state: 'ENABLED', settings: { showPageIndicator: false } }),
    ).toEqual({ badge: 'on', pill: false });
  });
});

describe('badgeFor', () => {
  it('maps each mode to badge text', () => {
    expect(badgeFor('on').text).toBe('ON');
    expect(badgeFor('error').text).toBe('!');
    expect(badgeFor('off').text).toBe('');
  });
});

describe('isAllowedFromSender', () => {
  it('lets web pages ask only for the indicator state', () => {
    expect(isAllowedFromSender('CORS_INDICATOR_STATE', false)).toBe(true);
    expect(isAllowedFromSender('CORS_ENABLE', false)).toBe(false);
    expect(isAllowedFromSender('CORS_IMPORT_CONFIG', false)).toBe(false);
    expect(isAllowedFromSender('CORS_ENABLE', true)).toBe(true);
  });
});
