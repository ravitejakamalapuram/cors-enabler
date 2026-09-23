# Privacy Policy — CORS Enabler Engine

Published policy: https://ravitejakamalapuram.github.io/cors-enabler.html

**Effective date:** September 21, 2026 · **Publisher:** Raviteja Kamalapuram

CORS Enabler Engine is a local developer debugging tool. It operates only on
user-configured origins using Chrome's declarative header-modification rules.
No HTTP request content, response payloads, or URLs are ever transmitted to any
remote server.

## Single purpose

Lets web developers configure and test cross-origin resource sharing (CORS)
headers on local development and test domains without altering production
servers.

## Data collection and usage

- **No payload inspection or storage.** Request and response bodies are never
  inspected, logged, or stored. Header modification happens inside Chrome via
  the `declarativeNetRequest` rules engine.
- **No analytics.** The extension contains no analytics or telemetry libraries.
- **No personal data.** No user identities, accounts, or usage data are
  collected, sold, or shared.

## Permissions

- `declarativeNetRequest` — adds CORS response headers (for example
  `Access-Control-Allow-Origin`) for developer-specified origins.
- `declarativeNetRequestFeedback` — shows which rules matched, for diagnostics.
- `storage` — keeps enabled rules and settings locally on the device.
- Host access (`<all_urls>`) — required by Chrome to modify response headers
  for the development APIs the user chooses to target.

## Contact

Raviteja Kamalapuram — raviteja369.k@gmail.com
