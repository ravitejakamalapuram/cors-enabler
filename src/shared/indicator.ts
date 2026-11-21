import type { CorsSettings, EngineState } from '@/engine/types';

/**
 * What the toolbar badge and the on-page pill should show. Both follow the
 * engine state, not just the persisted `enabled` flag: if rules fail to
 * re-install after a restart the engine is in ERROR with `enabled` still true,
 * and claiming ON there would be misleading.
 */
export type BadgeMode = 'on' | 'off' | 'error';

export interface IndicatorView {
  badge: BadgeMode;
  pill: boolean;
}

export function indicatorView(input: {
  enabled: boolean;
  state: EngineState;
  settings: Pick<CorsSettings, 'showPageIndicator'>;
}): IndicatorView {
  if (input.state === 'ERROR') return { badge: 'error', pill: false };
  const on = input.enabled && input.state === 'ENABLED';
  return { badge: on ? 'on' : 'off', pill: on && input.settings.showPageIndicator !== false };
}

/** Service worker -> content script push when the pill should change. */
export const INDICATOR_UPDATE = 'CORS_INDICATOR_UPDATE';
export interface IndicatorUpdateMessage {
  type: typeof INDICATOR_UPDATE;
  show: boolean;
}
