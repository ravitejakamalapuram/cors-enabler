# Testing

Testing this project has three tiers. Tier 1 is automated and runs here; tiers 2
and 3 require a real Chrome instance with the unpacked extension and are
documented as repeatable manual/Playwright procedures.

## Tier 1 — Unit tests (automated, `yarn test`)

Located in `src/tests/unit/`. 57 tests covering the pure engine:

| Suite | Covers |
| --- | --- |
| `domain-matcher.test.ts` | Origin/host normalization, `urlFilter` generation, wildcard/subdomain and host:port matching. |
| `cors-validator.test.ts` | CORS semantics: **rejects `*` + credentials**, rejects multi-origin credentialed, invalid origin/domain, origin resolution. |
| `rule-builder.test.ts` | Response-header generation for credentialed vs non-credentialed, `Vary: Origin`, PNA, explicit overrides. |
| `rule-manager.test.ts` | Rule CRUD immutability, duplicate/toggle, effective-rule calc (global + user), adapter delegation. |
| `state-manager.test.ts` | Full state-transition table, invalid transitions, `enable→disable→enable`. |
| `network-adapter.test.ts` | `CorsRule` → DNR rule conversion, global vs per-domain expansion, priorities, credentialed headers. |

```bash
yarn test            # run once
yarn test:coverage   # coverage for engine/ + shared/
```

The canonical semantic guard (spec §29) is asserted directly:

```
allowedOrigins = ['*'] + allowCredentials = true  ⇒  INVALID_CREDENTIALED_WILDCARD
```

## Tier 2 — Local integration environment (manual)

Spin up a frontend + a CORS-less API to exercise the real browser path.

```
test-app  → http://localhost:3000   (any dev server)
test-api  → http://localhost:4000   (an API that does NOT send CORS headers)
```

Minimal API that deliberately omits CORS headers:

```js
// server.js — node server.js
const http = require('http');
http
  .createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    // NOTE: intentionally no Access-Control-* headers
    res.end(JSON.stringify({ ok: true, method: req.method }));
  })
  .listen(4000, () => console.log('test-api on :4000'));
```

From a page on `http://localhost:3000`, run in the console:

```js
fetch('http://localhost:4000/data').then((r) => r.json()).then(console.log);
```

### Test matrix (spec §30)

| # | Scenario | Expected with extension **disabled** | Expected with extension **enabled** |
| --- | --- | --- | --- |
| 1 | Simple GET | Blocked by CORS | Succeeds |
| 2 | Extension disabled | Blocked | — |
| 3 | Extension enabled | — | Succeeds |
| 4 | GET | Blocked | Succeeds |
| 5 | POST JSON | Blocked (preflight) | Succeeds |
| 6 | `Authorization` header | Blocked (preflight) | Succeeds |
| 7 | OPTIONS preflight | Blocked | Succeeds **if** server returns 2xx for OPTIONS (see limitation) |
| 8 | Credentials (`credentials:'include'`) | Blocked | Succeeds only in **credentials mode** with a specific origin |
| 9 | Multiple origins | Blocked | Each needs its own credentialed rule (Chrome can't echo Origin) |
| 10 | Extension restart | — | Rules re-installed on `onStartup`/`onInstalled` |
| 11 | Chrome restart | — | State persists via `chrome.storage.local`; rules restored |
| 12 | Enable → Disable → Enable | — | No stale rules; serialized queue prevents corruption |
| 13 | Multiple tabs | — | Rules are global to the profile; all tabs benefit |
| 14 | Multiple API domains | — | Add domains to a rule or use the global rule |

Verify #10–12 by checking `chrome.declarativeNetRequest.getDynamicRules()` in the
service-worker console before/after each action, and the **Status** page's
"Installed DNR rules" count.

## Tier 3 — Real Chrome via Playwright (documented)

Playwright can launch a persistent context with the built extension loaded. This
is **not run in this sandbox** (no headed Chrome with extension support here),
but the procedure is:

```ts
import { chromium } from '@playwright/test';
import path from 'node:path';

const pathToExtension = path.resolve('dist');
const ctx = await chromium.launchPersistentContext('', {
  headless: false,
  args: [
    `--disable-extensions-except=${pathToExtension}`,
    `--load-extension=${pathToExtension}`,
  ],
});

// 1. Get the service worker to drive the engine:
const [sw] = ctx.serviceWorkers();
// 2. Enable via a message:
await sw.evaluate(() => chrome.runtime.sendMessage({ type: 'CORS_ENABLE' }));
// 3. Open the test app and assert the cross-origin fetch resolves:
const page = await ctx.newPage();
await page.goto('http://localhost:3000');
const ok = await page.evaluate(async () => {
  const r = await fetch('http://localhost:4000/data');
  return r.ok;
});
// expect(ok).toBe(true)
await ctx.close();
```

Assert the negative case too: disable the engine and confirm the same fetch
rejects with a CORS error.

## Manual acceptance checklist

- [ ] Popup loads and shows ●/○ state.
- [ ] Enable/Disable toggles the state and installs/removes DNR rules.
- [ ] State persists across popup reopen and Chrome restart.
- [ ] A cross-origin GET/POST that failed now succeeds when enabled.
- [ ] Credentialed request works in credentials mode with a specific origin.
- [ ] Diagnostics reports failing checks + limitations honestly.
- [ ] Disabling leaves **zero** extension rules behind.
