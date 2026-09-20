# CORS Enabler Engine

A professional, production-quality **Manifest V3** Chrome extension that relaxes
CORS for local development with **one click** — built on a reusable network rule
engine with real diagnostics.

> It does **not** disable Chromium's process-level web security (that requires
> launching Chrome with `--disable-web-security`). Instead it uses Chrome's
> supported `declarativeNetRequest` API to modify CORS **response headers** for
> development APIs, and honestly surfaces what the browser will and will not let
> an extension do.

![status](https://img.shields.io/badge/Manifest-V3-34d399) ![unit](https://img.shields.io/badge/unit%20tests-65%20passing-34d399) ![e2e](https://img.shields.io/badge/real--Chrome%20E2E-passing-34d399)

---

## What is CORS (30-second version)

When a page at `http://localhost:3000` calls an API at `https://api.example.com`,
the browser enforces the **Same-Origin Policy**. The API must return
`Access-Control-Allow-Origin` (and friends) or the browser blocks the response —
even though the request reached the server. During development the API often
isn't configured for your dev origin yet. This extension adds the missing CORS
response headers so you can keep building.

```
Frontend (localhost:3000) → request → API
API → response → CORS Engine (adds Access-Control-* headers) → Browser → Frontend
```

## Features

- **One-click Enable / Disable** with a clear ●/○ status.
- **Zero configuration** for common localhost development (a global rule covers all APIs).
- **CORS-correct**: never emits the invalid `Access-Control-Allow-Origin: *` +
  `Access-Control-Allow-Credentials: true` combination. Credentialed mode uses a
  specific origin automatically.
- **Rules UI**: per-domain / per-origin rules with enable, edit, duplicate, delete, priority.
- **Presets**: Local Development, React/Vite, Next.js, Angular, localhost-with-cookies.
- **Diagnostics engine**: simulate a request and see exactly what will happen —
  including browser-enforced limitations, instead of a green tick that lies.
- **Network Activity**: real `onRuleMatchedDebug` data for unpacked/dev builds.
- **Backup & restore**: export/import your rules + settings as a local JSON file.
- **Reusable engine**: the CORS logic is fully decoupled from React.

## Install (Load unpacked)

```bash
npm install       # or: yarn install
npm run build     # or: yarn build   → produces dist/
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. **Load unpacked** → select the generated `dist/` folder
4. Pin the extension and click it → **Enable CORS**

Requires **Chrome 116+**.

## Usage

1. Click the toolbar icon.
2. Click **Enable CORS**. Done — cross-origin dev requests now receive the
   necessary `Access-Control-*` response headers.
3. Need cookies/credentials? Open **Settings → Send cookies / credentials**, set
   your frontend origin, and the engine switches to a specific-origin +
   `Allow-Credentials: true` configuration.
4. Something still failing? Open **Diagnostics**, describe the request, and read
   the per-check breakdown and limitations.

## Permissions

| Permission                      | Why                                                                                                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                       | Persist enabled state, rules and settings locally. Nothing leaves the browser.                                                                                                                           |
| `declarativeNetRequest`         | Install dynamic rules that add CORS response headers. Chrome evaluates rules internally — the request payload is never exposed to the extension.                                                         |
| `declarativeNetRequestFeedback` | Report which rules matched (Network Activity). Functional for unpacked/dev builds only.                                                                                                                  |
| `host_permissions: <all_urls>`  | Modifying **response** headers requires host access to the request URL. The global "Enable CORS" feature targets arbitrary dev APIs, so broad host access is required. See [SECURITY.md](./SECURITY.md). |

## What this extension can and cannot do

|     | Capability                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------- |
| ✓   | Add/override CORS response headers (ACAO, ACAM, ACAH, ACEH, ACAC).                                               |
| ✓   | Apply headers to preflight (OPTIONS) responses returned by the server.                                           |
| ✓   | Correct credentialed CORS (specific origin + `Allow-Credentials: true`).                                         |
| ✓   | `Access-Control-Allow-Private-Network` for public→localhost requests.                                            |
| ~   | Multiple simultaneous credentialed origins — one origin per rule only (Chrome cannot echo the request `Origin`). |
| ~   | Network activity inspection — unpacked/dev builds only, no response status codes.                                |
| ✗   | Fabricate a 2xx preflight response when the server errors on OPTIONS.                                            |
| ✗   | Disable Chromium process-level web security (needs the `--disable-web-security` flag).                           |
| ✗   | Read opaque (`no-cors`) response bodies — the browser never exposes them to any extension.                       |

## Scripts

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `npm run dev`    | Vite dev server with HMR (CRXJS).        |
| `npm run build`  | Type-check + production build → `dist/`. |
| `npm test`       | Run Vitest unit tests.                   |
| `npm run lint`   | ESLint.                                  |
| `npm run format` | Prettier write.                          |

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — engine design and data flow.
- [SECURITY.md](./SECURITY.md) — permissions, data handling, threat model.
- [DEVELOPMENT.md](./DEVELOPMENT.md) — local dev workflow.
- [TESTING.md](./TESTING.md) — unit + integration + real-Chrome strategy.

## License

MIT
