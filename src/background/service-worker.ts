import { ensureInitialized, getEngine } from '@/engine';
import { handleMessage, isAllowedFromSender } from '@/background/message-handler';
import { isExtensionMessage } from '@/shared/messages';
import { rootLogger } from '@/shared/logger';
import { loadConfig } from '@/shared/storage';
import { STORAGE_KEYS } from '@/shared/constants';
import { applyBadge } from '@/background/badge';
import { INDICATOR_UPDATE, indicatorView, type IndicatorUpdateMessage } from '@/shared/indicator';

const log = rootLogger.child('ServiceWorker');

// Kick off initialization as early as possible. This re-installs dynamic rules
// after a service-worker or full Chrome restart (spec §41).
ensureInitialized().catch((e) => log.error('Init failed', e));

// Keep the toolbar badge and the on-page pill in sync with the persisted
// engine state (enabled + state + settings). Driving them from state, not just
// `enabled`, means a failed re-install after restart shows "!" instead of ON.
// Re-applied on every SW start because Chrome drops badge text on restart.
async function syncIndicators(): Promise<void> {
  const config = await loadConfig();
  const view = indicatorView(config);
  await applyBadge(view.badge);
  const update: IndicatorUpdateMessage = { type: INDICATOR_UPDATE, show: view.pill };
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map((t) =>
      // Tabs without our content script (chrome://, store pages) reject; ignore.
      t.id === undefined ? null : chrome.tabs.sendMessage(t.id, update).catch(() => undefined),
    ),
  );
}
const INDICATOR_KEYS: string[] = [STORAGE_KEYS.enabled, STORAGE_KEYS.state, STORAGE_KEYS.settings];
void syncIndicators().catch((e) => log.error('Indicator init failed', e));
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && INDICATOR_KEYS.some((k) => k in changes)) {
    syncIndicators().catch((e) => log.error('Indicator update failed', e));
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  log.info('onInstalled', { reason: details.reason });
  void ensureInitialized();
});

chrome.runtime.onStartup.addListener(() => {
  log.info('onStartup — restoring rules');
  void ensureInitialized();
});

// Typed message bridge for popup/options, plus the page indicator's one
// read-only query. Content scripts run in web page renderers, so their
// messages (sender origin is the page's) may not read or change config.
const EXTENSION_ORIGIN = new URL(chrome.runtime.getURL('')).origin;
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const fromExtensionPage = sender.id === chrome.runtime.id && sender.origin === EXTENSION_ORIGIN;
  if (!isExtensionMessage(message) || !isAllowedFromSender(message.type, fromExtensionPage)) {
    sendResponse({
      ok: false,
      error: {
        code: 'UNSUPPORTED_REQUEST',
        message: 'Malformed message',
        userMessage: 'The extension received an invalid message.',
        recoverable: true,
      },
    });
    return false;
  }

  void (async () => {
    await ensureInitialized();
    const result = await handleMessage(getEngine(), message);
    sendResponse(result);
  })();

  // Keep the message channel open for the async response.
  return true;
});

// Real network activity via declarativeNetRequest (dev/unpacked builds only).
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const { request, rule } = info;
    getEngine().recordActivity({
      id: `${request.requestId}-${rule.ruleId}`,
      timestamp: Date.now(),
      method: request.method,
      url: request.url,
      type: request.type,
      ruleId: rule.ruleId,
      tabId: request.tabId,
    });
  });
}
