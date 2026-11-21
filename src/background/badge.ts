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

export function badgeFor(enabled: boolean): BadgeView {
  return enabled
    ? {
        text: 'ON',
        color: '#d97706',
        title: 'CORS Enabler: ON. CORS headers are being relaxed. Click to turn off.',
      }
    : { text: '', color: '#6b7280', title: 'CORS Enabler: off' };
}

export async function applyBadge(enabled: boolean): Promise<void> {
  const view = badgeFor(enabled);
  await Promise.all([
    chrome.action.setBadgeText({ text: view.text }),
    chrome.action.setBadgeBackgroundColor({ color: view.color }),
    chrome.action.setTitle({ title: view.title }),
  ]);
}
