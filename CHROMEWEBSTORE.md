# Chrome Web Store Listing & Publishing Record

*Last Updated: 2026-09-22*

---

## 1. Extension Information
- **Name**: CORS Enabler Engine
- **Extension ID**: `bfegjbdhenoahnnajgmlkcdkfcjgnjjc`
- **Publisher ID**: `9637cb78-fa33-49dd-a4cb-91066ff182e3`
- **Version**: `1.0.1`
- **Manifest Version**: `MV3`
- **Language**: `en`
- **Category**: `Developer Tools`
- **Status**: `Pending review`

---

## 2. Store Listing Copy

### Short Description (max 132 characters)
> Relax CORS for local web development using DeclarativeNetRequest. A network rule engine with diagnostics for web APIs.

### Detailed Description
```markdown
CORS Enabler Engine

Relax CORS for local development with one click using Chrome’s declarativeNetRequest API. A network rule engine + diagnostics, not a header hack.

Key Features:
- Local-first and private: all data operations run strictly inside your browser.
- High performance: fast processing for developer workflows.
- Clean and intuitive interface designed for modern productivity.

How to use:
1. Open the extension from the Chrome toolbar.
2. Toggle CORS relaxation or configure custom headers.
3. Inspect rule match events in the diagnostics view.
```

---

## 3. Permissions Justifications (Required for Review)

| Permission | Used in Code? | Sample Evidence | Required? | Risk | Plain-English Review Justification |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `storage` | Yes | Local state | Yes | LOW | Required to locally persist user settings, configurations, and application state across sessions. |
| `declarativeNetRequest` | Yes | Network rules | Yes | MEDIUM | Applies declarative network modification rules without reading sensitive request bodies. |
| `declarativeNetRequestFeedback` | Yes | Debug rules | Yes | MEDIUM | Enables chrome.declarativeNetRequestFeedback API functionality for developer diagnostics. |
| `host_permissions` | Yes | `<all_urls>` | Yes | HIGH | Access is required to arbitrary URLs to allow developers to test and relax CORS restrictions across any development backend. |

---

## 4. Privacy & Data Use Disclosure

- **Privacy Policy URL**: `https://ravitejakamalapuram.github.io/cors-enabler.html`
- **Data Flow**: Purely local. No user data, browse history, or network request payloads are transmitted to any remote servers.

---

## 5. Release History

| Version | Date | Status | Package ZIP | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | 2026-09-21 | Rejected | `cors-enabler-v1.0.0.zip` | Rejected under Purple Nickel due to third-party preview privacy URL |
| `1.0.1` | 2026-09-22 | Pending review | `cors-enabler-v1.0.1.zip` | Fixed privacy policy URL to dedicated GitHub Pages site and resubmitted |
