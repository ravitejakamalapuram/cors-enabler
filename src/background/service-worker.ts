import { ensureInitialized, getEngine } from '@/engine';
import { handleMessage } from '@/background/message-handler';
import { isExtensionMessage } from '@/shared/messages';
import { rootLogger } from '@/shared/logger';
import { loadConfig } from '@/shared/storage';
import { STORAGE_KEYS } from '@/shared/constants';
import { applyBadge } from '@/background/badge';

const log = rootLogger.child('ServiceWorker');

// Kick off initialization as early as possible. This re-installs dynamic rules
// after a service-worker or full Chrome restart (spec §41).
ensureInitialized().catch((e) => log.error('Init failed', e));

// Keep the toolbar badge in sync with the persisted enabled flag. The engine
// only saves `enabled` after rules are installed or cleared, so the badge never
// claims ON for a failed enable. Re-applied on every SW start because Chrome
// drops badge text on browser restart.
void loadConfig()
  .then((c) => applyBadge(c.enabled))
  .catch((e) => log.error('Badge init failed', e));
chrome.storage.onChanged.addListener((changes, areaName) => {
  const change = changes[STORAGE_KEYS.enabled];
  if (areaName === 'local' && change) {
    applyBadge(Boolean(change.newValue)).catch((e) => log.error('Badge update failed', e));
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

// Typed message bridge for popup/options.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isExtensionMessage(message)) {
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
