import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

/**
 * Manifest V3 configuration.
 *
 * Permission rationale (see SECURITY.md for the full write-up):
 * - "storage": persist enabled state, rules, presets and settings in
 *   chrome.storage.local. Nothing leaves the browser.
 * - "declarativeNetRequest": install dynamic rules that add CORS response
 *   headers. This is the modern, privacy-preserving replacement for the
 *   MV2 blocking webRequest API — rules are evaluated inside Chrome and the
 *   request payload is never exposed to the extension.
 * - "declarativeNetRequestFeedback": enables chrome.declarativeNetRequest
 *   .onRuleMatchedDebug so the Diagnostics / Network Activity views can show
 *   which rules actually matched. Only functional for unpacked / dev builds,
 *   which is exactly the target audience.
 *
 * host_permissions: modifying *response* headers with declarativeNetRequest
 * requires host access to the request URL. The global "Enable CORS" feature
 * targets arbitrary development APIs, so <all_urls> is required for it to
 * work. This is documented transparently in the UI and SECURITY.md. Users who
 * want a narrower footprint can disable global mode and rely on per-domain
 * rules only (host access is still needed for those specific domains).
 */
export default defineManifest({
  manifest_version: 3,
  name: 'CORS Enabler Engine',
  description:
    'Relax CORS for local development with one click using Chrome\u2019s declarativeNetRequest API. A network rule engine + diagnostics, not a header hack.',
  version: pkg.version,
  minimum_chrome_version: '116',
  action: {
    default_popup: 'index.html',
    default_title: 'CORS Enabler',
    default_icon: {
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  options_page: 'options.html',
  icons: {
    '16': 'icons/icon-16.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
  permissions: ['storage', 'declarativeNetRequest', 'declarativeNetRequestFeedback'],
  host_permissions: ['<all_urls>'],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'",
  },
});
