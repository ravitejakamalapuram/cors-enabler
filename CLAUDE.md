# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CORS Enabler is a Manifest V3 Chrome extension (Chrome 116+) that relaxes CORS for local development by installing `chrome.declarativeNetRequest` dynamic rules that add `Access-Control-*` response headers. React 18 + TypeScript (strict) + Vite with `@crxjs/vite-plugin`. It is a dev/debugging aid: never present it as disabling browser security or as a production fix.

## Commands

```bash
npm ci                    # CI and release use npm against package-lock.json
npm run build             # tsc --noEmit + vite build -> dist/ (load unpacked from chrome://extensions)
npm run dev               # Vite + CRXJS HMR
npm run typecheck
npm run lint              # eslint .
npm run format:check      # prettier on src/**
npm test                  # vitest run (unit, jsdom)
npx vitest run src/tests/unit/rule-builder.test.ts -t "test name"   # single file / test
npm run test:coverage     # covers src/engine + src/shared (excludes network-adapter.ts, engine/index.ts)
npm run test:e2e          # Playwright, real Chromium with the built extension; needs `npm run build` first
bash scripts/package.sh   # zip dist/ for the Chrome Web Store
```

The release gate (`release.yaml`) runs `lint && format:check && typecheck && test`; run all four before pushing. CI (`.github/workflows/ci.yml`) delegates to the external `ravitejakamalapuram/release-platform` reusable workflow, so CI logic is not in this repo.

E2E (`src/tests/e2e/`) uses a local bench that Playwright starts itself: `test/test-api/server.mjs` (:4000, the cross-origin API) and `test/test-app/serve.mjs` (:3000, the page). Run headless on Linux with `xvfb-run -a npm run test:e2e`. `npm run test:bench` starts both servers for manual testing.

## Architecture

Strict layering, documented in `ARCHITECTURE.md`:

```
popup/ + options/ (React)  --typed messages (shared/messages.ts)-->  background/ (service worker + message-handler router)
  --> engine/cors-engine.ts (orchestrator) --> rule-manager / state-manager / diagnostics-engine / cors-validator / rule-builder / domain-matcher
  --> engine/network-adapter.ts --> chrome.declarativeNetRequest
```

Rules that matter when changing code:

- UI never imports `network-adapter` or calls `chrome.declarativeNetRequest`; it only uses `sendMessage` with message types from `shared/messages.ts`. Adding a feature that crosses layers means adding a message type there and a case in `background/message-handler.ts`.
- `engine/` is framework-agnostic and pure except `network-adapter.ts` (the only DNR touchpoint) and storage via the persistence port. Unit tests drive `CorsEngine` with an in-memory `NetworkAdapter` mock, so keep `chrome.*` out of everything else.
- `CorsEngine` serializes all mutating operations through one promise queue, and every install is remove-stale -> add -> re-read-and-verify; `getStatus()` reconciles cached state against `getDynamicRules()`. Preserve both properties.
- State transitions go through the explicit machine in `state-manager.ts` (pure `nextState`), not ad-hoc flags.
- The service worker re-installs rules on `onInstalled`/`onStartup`, since dynamic rules and in-memory state must survive SW restarts.

Rule model -> DNR (`network-adapter.buildDnrRules`): a global rule (no domains) becomes one DNR rule matching all `xmlhttprequest` at priority 1; a domain rule becomes one DNR rule per domain using `urlFilter` (so ports work, which `requestDomains` cannot express) at priority >= 2 so specific rules beat the global one. DNR ids live in `DNR_RULE_ID_BASE..DNR_RULE_ID_MAX` (`shared/constants.ts`).

CORS semantics are enforced in `cors-validator.ts` (e.g. rejects `*` with credentials and multi-origin credentialed rules). Adding a rule field touches, in order: `engine/types.ts` (`CorsRule`), `rule-builder.ts` (header mapping), `cors-validator.ts`, `options/components/RuleEditor.tsx`, plus a unit test.

`@` is aliased to `src/` (tsconfig and vitest). Manifest is `manifest.config.ts` (popup `index.html`, options `options.html`).

## Permissions and store metadata

`host_permissions: ['<all_urls>']` plus `declarativeNetRequestFeedback` (`onRuleMatchedDebug` only fires for unpacked installs, so Network Activity is dev-only). Any manifest permission change must be mirrored in `.appforge/permissions.yaml` (justification, data access, security impact) and reflected in `PRIVACY.md` / `chrome-store/` listing. The version comes from `package.json`; `release.yaml` holds the Web Store item id and publishing contract.
