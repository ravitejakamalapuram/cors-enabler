import type { BadgeMode } from '@/shared/indicator';

/**
 * Toolbar badge that makes the "CORS is on" state visible without opening the
 * popup. Chrome clears badge text on browser restart, so the service worker
 * re-applies it on every start (see service-worker.ts).
 */
export interface BadgeView {
  text: string;
  color: string;
  title: string;
}

export function badgeFor(mode: BadgeMode): BadgeView {
  switch (mode) {
    case 'on':
      return {
        text: 'ON',
        color: '#d97706',
        title: 'CORS Enabler: ON. CORS headers are being relaxed. Click to turn off.',
      };
    case 'error':
      return {
        text: '!',
        color: '#dc2626',
        title: 'CORS Enabler: error. Rules could not be installed. Click for details.',
      };
    default:
      return { text: '', color: '#6b7280', title: 'CORS Enabler: off' };
  }
}

export async function applyBadge(mode: BadgeMode): Promise<void> {
  const view = badgeFor(mode);
  await Promise.all([
    chrome.action.setBadgeText({ text: view.text }),
    chrome.action.setBadgeBackgroundColor({ color: view.color }),
    chrome.action.setTitle({ title: view.title }),
  ]);
}
