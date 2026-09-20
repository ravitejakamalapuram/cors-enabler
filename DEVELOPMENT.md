# Development

## Prerequisites

- Node 18+ (project developed on Node 20)
- Chrome / Chromium **116+**
- `npm` or `yarn` (the repo is developed with yarn; both work)

## Setup

```bash
yarn install          # or npm install
```

## Common commands

| Command                             | What it does                                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `yarn dev`                          | Vite + CRXJS dev server with HMR. Load the generated `dist/` (or the dev build dir CRXJS prints) as an unpacked extension. |
| `yarn build`                        | `tsc --noEmit` then `vite build` → `dist/`.                                                                                |
| `yarn build:only`                   | Skip type-check, just build.                                                                                               |
| `yarn test`                         | Run Vitest unit tests once.                                                                                                |
| `yarn test:watch`                   | Vitest watch mode.                                                                                                         |
| `yarn test:coverage`                | Coverage report for `engine/` and `shared/`.                                                                               |
| `yarn typecheck`                    | Strict TypeScript check.                                                                                                   |
| `yarn lint` / `yarn lint:fix`       | ESLint.                                                                                                                    |
| `yarn format` / `yarn format:check` | Prettier.                                                                                                                  |

## Loading in Chrome

```
chrome://extensions → Developer mode ON → Load unpacked → select dist/
```

After a `yarn build`, hit the **reload** icon on the extension card (or use
`yarn dev` for HMR during UI work).

## Project layout

```
src/
├── background/   service worker + typed message router
├── engine/       framework-agnostic CORS engine (the reusable core)
├── popup/        React popup (Enable/Disable + status)
├── options/      React options page (rules, presets, diagnostics, network, settings)
├── shared/       constants, logger, storage, messages
├── ui/           shared React components + theme.css
└── tests/unit/   Vitest suites
manifest.config.ts   MV3 manifest (defineManifest)
vite.config.ts       Vite + @crxjs/vite-plugin
```

## Adding a rule field

1. Extend `CorsRule` in `engine/types.ts`.
2. Map it to a header in `engine/rule-builder.ts` (respect CORS semantics).
3. Validate it in `engine/cors-validator.ts`.
4. Surface it in `options/components/RuleEditor.tsx`.
5. Add a unit test.

## Building a new engine (reuse)

Implement `NetworkExtensionEngine` from `engine/types.ts` and reuse
`RuleManager`, `StateMachine` and a `NetworkAdapter`. The messaging layer and UI
patterns can be reused wholesale — see ARCHITECTURE.md §"Why this shape?".

## Debugging

- Turn on **Settings → Developer mode** for verbose logs, installed rule ids and
  Chrome API errors.
- Inspect the service worker from `chrome://extensions` → the extension →
  _service worker_ link.
- Use **Diagnostics** to reason about a specific failing request.
- Use **Network Activity** to see which rules actually matched.
