# Security

CORS relaxation is a **development-only** capability. This document is explicit
about what the extension does, why it needs its permissions, and what it will
never do.

## Why relaxing CORS is development-only

The Same-Origin Policy and CORS exist to protect users: they stop a malicious
page from reading responses from other origins (your bank, your email) using
your credentials. An extension that adds `Access-Control-*` headers to responses
weakens that protection for the URLs it targets. That trade-off is acceptable on
a developer's machine talking to their own dev APIs; it is **not** something to
leave enabled during normal browsing. The extension therefore:

- ships **disabled** by default,
- makes the ON/OFF state impossible to miss,
- removes **all** of its rules the moment you disable it.

## What this extension does NOT do

- ❌ It does **not** disable Chromium's process-level web security. That only
  happens when Chrome is launched with `--disable-web-security`, which no
  extension can do. We never claim otherwise.
- ❌ It does **not** collect, store, or transmit cookies, tokens, passwords, or
  API credentials.
- ❌ It has **no external backend** and sends **no telemetry**. All state lives in
  `chrome.storage.local` on your machine.
- ❌ It does **not** inject or execute remote/arbitrary JavaScript, and uses no
  `eval`.
- ❌ It does **not** read response bodies. It only asks Chrome to set response
  **headers** via `declarativeNetRequest`; Chrome evaluates rules internally and
  never hands the request/response payload to the extension.

## Permissions (least privilege)

| Permission                      | Justification                                                                                                                                                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                       | Persist enabled state, rules, presets and settings locally.                                                                                                                                                                                  |
| `declarativeNetRequest`         | The modern, privacy-preserving replacement for MV2 blocking `webRequest`. Rules are declarative and evaluated by the browser; the extension never inspects individual request payloads.                                                      |
| `declarativeNetRequestFeedback` | Enables `onRuleMatchedDebug` for the Network Activity view. Chrome only fires this for **unpacked / developer-mode** extensions, which matches the audience.                                                                                 |
| `host_permissions: <all_urls>`  | **Modifying response headers requires host access to the request URL.** The headline "Enable CORS" feature targets _arbitrary_ development APIs whose hosts aren't known in advance, so broad host access is required for it to work at all. |

### Reducing the host footprint

If you don't want `<all_urls>`, you can:

1. Disable the global rule and rely solely on **per-domain rules** (still needs
   host access to those specific domains — edit `manifest.config.ts`
   `host_permissions` to list them), or
2. Keep the extension **disabled** except when actively debugging.

The global feature is only as broad as it needs to be; nothing runs while the
engine is disabled.

## Content Security Policy

Extension pages use a strict CSP:

```
script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'
```

No remote scripts, no `eval`. (`'unsafe-inline'` applies to styles only, required
by the bundler's injected stylesheet handling.)

## Message validation

Every message received by the service worker is validated by
`isExtensionMessage` before dispatch, and the router is exhaustively typed
(`never` check) so unknown commands are rejected with a structured error rather
than silently executed.

## Data handling summary

| Data                           | Where it lives                              | Leaves the browser? |
| ------------------------------ | ------------------------------------------- | ------------------- |
| Enabled state, rules, settings | `chrome.storage.local`                      | No                  |
| Network activity (dev builds)  | In-memory ring buffer in the service worker | No                  |
| Cookies / tokens / credentials | Never read or stored                        | No                  |

## Reporting

This is a developer tool without a hosted backend. Report issues via the project
repository's issue tracker.
