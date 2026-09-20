import { CorsEngine } from '@/engine/cors-engine';
import { ChromeNetworkAdapter } from '@/engine/network-adapter';
import {
  loadConfig,
  saveEnabled,
  saveLastError,
  saveRules,
  saveSettings,
  saveState,
} from '@/shared/storage';
import type { EngineState } from '@/engine/types';

export { CorsEngine } from '@/engine/cors-engine';
export { ChromeNetworkAdapter } from '@/engine/network-adapter';
export { RuleManager } from '@/engine/rule-manager';
export * from '@/engine/types';

let singleton: CorsEngine | null = null;
let initialized: Promise<void> | null = null;

/**
 * Chrome-backed CORS engine singleton for the service worker. The engine
 * itself is portable; this factory just wires in the real adapter + storage.
 */
export function getEngine(): CorsEngine {
  if (!singleton) {
    singleton = new CorsEngine({
      adapter: new ChromeNetworkAdapter(),
      persistence: {
        async loadEnabled() {
          return (await loadConfig()).enabled;
        },
        saveEnabled,
        async loadRules() {
          return (await loadConfig()).rules;
        },
        saveRules,
        async loadSettings() {
          return (await loadConfig()).settings;
        },
        saveSettings,
        saveState: (state: string) => saveState(state as EngineState),
        saveLastError,
      },
    });
  }
  return singleton;
}

export function ensureInitialized(): Promise<void> {
  if (!initialized) {
    initialized = getEngine().initialize();
  }
  return initialized;
}
