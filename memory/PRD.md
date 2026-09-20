# CORS Enabler Engine — PRD

## Original problem statement
Build a professional, production-quality Manifest V3 Chrome extension that enables
CORS for local development with one click, using the strongest supported Chrome
extension APIs (declarativeNetRequest) — built on a reusable, React-independent
network engine with diagnostics, rules, presets and honest limitation reporting.
No fake "it works" UI; status must reflect real Chrome rule state.

## User choices (from ask_human)
- Built in `/app` root as a self-contained repo.
- Full first delivery (engine + popup + options + diagnostics + rules + presets + docs + unit tests).
- Vitest unit tests only for v1; Playwright/real-Chrome documented, not run in sandbox.
- Local test-app/test-api deferred (post Web Store).
- Clean dark developer-tool aesthetic (agent-designed).

## Architecture (implemented)
UI (React popup/options) → typed messages → service worker → CorsEngine →
{RuleManager, StateMachine, DiagnosticsEngine, cors-validator, rule-builder,
domain-matcher} → ChromeNetworkAdapter (declarativeNetRequest). UI never touches
Chrome networking directly. Engine implements generic `NetworkExtensionEngine`
for reuse. Serialized op queue prevents enable/disable races. Deterministic rule
install/clear with verification. State persisted in chrome.storage.local;
rules re-installed on onInstalled/onStartup.

Stack: TypeScript (strict), Manifest V3, React 18, Vite 5 + @crxjs/vite-plugin 2.7.1,
Vitest, ESLint 9, Prettier.

## Key CORS decisions (browser-truthful)
- Non-credentialed: wildcard `*` headers.
- Credentialed: specific origin + `Allow-Credentials: true` (never `*`); rejects
  `*`+credentials and multi-origin credentialed as browser-enforced limitations.
- Response-header modification requires `host_permissions: <all_urls>` (documented).
- Cannot fabricate preflight responses / disable process-level web security —
  surfaced via Diagnostics + capability matrix, never faked.

## Implemented (2026-06)
- CORS Engine public API: enable/disable/isEnabled/getStatus/get-add-update-remove-
  duplicate-toggle-clear rules/applyPreset/get-updateSettings/diagnose/activity.
- Popup: one-click Enable/Disable, ●/○ status, current site, rule/domain counts,
  credentials mode, diagnostics checks, open-diagnostics.
- Options: Status, Rules (CRUD + editor), Presets (5), Diagnostics simulator,
  Network Activity (onRuleMatchedDebug), Settings (credentials, PNA, dev mode,
  logging, capability matrix), hash routing, a11y.
- 57 Vitest unit tests passing (domain-matcher, cors-validator, rule-builder,
  rule-manager, state-manager, network-adapter).
- Docs: README, ARCHITECTURE, SECURITY, DEVELOPMENT, TESTING. `scripts/package.sh`.
- App icon generated (16/48/128). Build produces loadable `dist/`.

## Backlog
- P1: Local test-app (:3000) + CORS-less test-api (:4000) for manual/Playwright E2E.
- P1: Playwright real-Chrome suite (launchPersistentContext with unpacked ext).
- P2: Per-tab / current-site scoping toggle in popup.
- P2: Import/export rule config (JSON).
- P2: Request-header modification rules (engine already abstracts it).
- P2: Optional local Node proxy companion for cases DNR can't cover (spec §35).

## Next tasks
See backlog P1 items first (test env + Playwright) before Web Store packaging.
