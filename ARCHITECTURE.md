# Architecture

The extension is intentionally **not** monolithic. The UI never touches Chrome
networking APIs directly — everything flows through a reusable engine.

```
┌──────────────────────────────────────────────┐
│                  Chrome UI                     │
│  Popup (React)      Options (React)            │
│  Status / Toggle    Rules / Presets /          │
│                     Diagnostics / Network /     │
│                     Settings                    │
└───────────────────────┬────────────────────────┘
                        │ typed messages (shared/messages.ts)
                        ▼
┌──────────────────────────────────────────────┐
│              Service Worker                    │
│  background/service-worker.ts                  │
│  background/message-handler.ts (typed router)  │
└───────────────────────┬────────────────────────┘
                        ▼
┌──────────────────────────────────────────────┐
│                CORS Engine                     │
│  engine/cors-engine.ts                          │
│  enable / disable / status / add/remove/update  │
│  rule / getRules / clearRules / diagnose        │
│  (implements NetworkExtensionEngine)            │
└───────────────────────┬────────────────────────┘
        ┌───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼
   Rule Manager    State Machine    Diagnostics     Validator /
   rule-manager.ts state-manager.ts diagnostics-    rule-builder /
                                    engine.ts       domain-matcher
        │
        ▼
   Network Adapter (engine/network-adapter.ts)
   chrome.declarativeNetRequest.updateDynamicRules
        │
        ▼
   Browser network layer
```

## Layers

### `shared/`

Leaf utilities with no engine dependencies at runtime:

- `constants.ts` — storage keys, header names, defaults, DNR id range.
- `logger.ts` — levelled logger; debug suppressed unless developer mode.
- `storage.ts` — typed `chrome.storage.local` wrapper.
- `messages.ts` — the typed message contract + `sendMessage` helper.

### `engine/`

Framework-agnostic. No React, and `chrome.*` is confined to two files
(`network-adapter.ts`, and `storage.ts` via the persistence port). Everything
else is pure and unit-tested.

| File                    | Responsibility                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `types.ts`              | All domain types + the `NetworkExtensionEngine` and `NetworkAdapter` contracts.                                         |
| `domain-matcher.ts`     | Origin/host normalization, `urlFilter` generation, matching.                                                            |
| `cors-validator.ts`     | Real CORS semantics + Chrome constraints (rejects `*`+credentials, multi-origin credentialed, invalid origins/domains). |
| `rule-builder.ts`       | Turns a `CorsRule` into concrete response-header mutations.                                                             |
| `rule-manager.ts`       | Pure rule-list CRUD + effective-rule calculation (global rule + user rules); delegates install to the adapter.          |
| `network-adapter.ts`    | The **only** DNR touchpoint. Converts rules → dynamic rules, installs/clears deterministically, verifies.               |
| `state-manager.ts`      | Explicit state machine (pure `nextState` + `StateMachine`).                                                             |
| `diagnostics-engine.ts` | Request analysis + network-activity ring buffer.                                                                        |
| `cors-engine.ts`        | Orchestrator. Serializes operations, persists, exposes the public API.                                                  |
| `presets.ts`            | Pure preset data → rule inputs.                                                                                         |
| `index.ts`              | Chrome-backed singleton factory.                                                                                        |

### `background/`

The service worker wires the Chrome-backed engine, re-installs rules on
`onInstalled`/`onStartup` (surviving restarts), and routes typed messages.

### `popup/` and `options/`

React consumers only. They call `sendMessage(...)` and render status. They never
import `network-adapter` or call `chrome.declarativeNetRequest`.

## Why this shape?

- **Reusability (spec §23):** `CorsEngine` implements the generic
  `NetworkExtensionEngine` contract. A future `HeaderOverrideEngine`,
  `RequestRewriteEngine`, etc. can reuse `RuleManager`, `StateMachine`,
  `NetworkAdapter` and the messaging layer unchanged.
- **Testability:** the `NetworkAdapter` interface lets tests drive the engine
  with an in-memory mock; pure modules need no Chrome at all.
- **Determinism (spec §26):** enabling always removes stale dynamic rules before
  installing and then re-reads the installed set to verify. Disabling verifies
  removal. The engine reconciles cached state with `getDynamicRules()` in
  `getStatus()`.
- **No race conditions (spec §25):** all mutating operations run through a single
  serialized promise queue, so `enable()/disable()/enable()` can't interleave and
  corrupt Chrome's dynamic rule set.

## Rule model → declarativeNetRequest

A `CorsRule` is expanded by `network-adapter.buildDnrRules`:

- **Global rule** (no domains) → one DNR rule whose condition is just
  `resourceTypes: ['xmlhttprequest']` (matches all URLs), priority `1`.
- **Domain rule** → one DNR rule **per domain**, each with a `urlFilter`
  (ports are supported via `urlFilter`, which `requestDomains` cannot express),
  priority `≥2` so specific rules win over the global rule.
- Each rule's action is `modifyHeaders` with `responseHeaders` computed by
  `rule-builder` following CORS semantics.

## Data flow: "Enable CORS"

```
Popup click
  → sendMessage({type:'CORS_ENABLE'})
  → service worker → handleMessage → engine.enable()
      → StateMachine: DISABLED → ENABLING
      → validate rules (cors-validator)
      → RuleManager.computeEffectiveRules (global + user)
      → NetworkAdapter.sync: remove stale → addRules → verify
      → persist enabled=true, StateMachine: ENABLING → ENABLED
  → returns CorsStatus → popup renders ● CORS Enabled
```
