import { STORAGE_KEYS } from '@/shared/constants';

/**
 * Decide whether the on-page "CORS ON" pill should show, from the raw
 * chrome.storage.local values. Pure so it can be unit tested without a DOM.
 * `showPageIndicator` defaults to true when settings predate the option.
 */
export function shouldShowIndicator(raw: Record<string, unknown>): boolean {
  const settings = raw[STORAGE_KEYS.settings] as { showPageIndicator?: unknown } | undefined;
  return raw[STORAGE_KEYS.enabled] === true && settings?.showPageIndicator !== false;
}
