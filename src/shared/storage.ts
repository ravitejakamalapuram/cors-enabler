import { DEFAULT_RESOURCE_TYPES, DEFAULT_SETTINGS, STORAGE_KEYS } from '@/shared/constants';
import type { CorsRule, CorsSettings, EngineError, EngineState } from '@/engine/types';

/**
 * Typed wrapper around chrome.storage.local. This is the only place, besides
 * the network-adapter, that touches a `chrome.*` API — everything else in the
 * engine is pure and testable.
 */
export interface PersistedConfig {
  enabled: boolean;
  rules: CorsRule[];
  settings: CorsSettings;
  state: EngineState;
  lastError: EngineError | null;
}

function area(): chrome.storage.LocalStorageArea {
  return chrome.storage.local;
}

// Older versions saved every rule was saved as fetch/XHR-only and no UI could change
// that, so a stored ['xmlhttprequest'] is always the old default: upgrade it so
// existing rules also cover crossorigin images, fonts, media and scripts.
function upgradeResourceTypes(rule: CorsRule): CorsRule {
  const types = rule.resourceTypes;
  return types?.length === 1 && types[0] === 'xmlhttprequest'
    ? { ...rule, resourceTypes: [...DEFAULT_RESOURCE_TYPES] }
    : rule;
}

export async function loadConfig(): Promise<PersistedConfig> {
  const raw = await area().get([
    STORAGE_KEYS.enabled,
    STORAGE_KEYS.rules,
    STORAGE_KEYS.settings,
    STORAGE_KEYS.state,
    STORAGE_KEYS.lastError,
  ]);
  return {
    enabled: Boolean(raw[STORAGE_KEYS.enabled]),
    rules: ((raw[STORAGE_KEYS.rules] as CorsRule[]) ?? []).map(upgradeResourceTypes),
    settings: {
      ...DEFAULT_SETTINGS,
      ...((raw[STORAGE_KEYS.settings] as Partial<CorsSettings>) ?? {}),
    },
    state: (raw[STORAGE_KEYS.state] as EngineState) ?? 'DISABLED',
    lastError: (raw[STORAGE_KEYS.lastError] as EngineError | null) ?? null,
  };
}

export async function saveEnabled(enabled: boolean): Promise<void> {
  await area().set({ [STORAGE_KEYS.enabled]: enabled });
}

export async function saveRules(rules: CorsRule[]): Promise<void> {
  await area().set({ [STORAGE_KEYS.rules]: rules });
}

export async function saveSettings(settings: CorsSettings): Promise<void> {
  await area().set({ [STORAGE_KEYS.settings]: settings });
}

export async function saveState(state: EngineState): Promise<void> {
  await area().set({ [STORAGE_KEYS.state]: state });
}

export async function saveLastError(error: EngineError | null): Promise<void> {
  await area().set({ [STORAGE_KEYS.lastError]: error });
}

export function onConfigChanged(cb: () => void): () => void {
  const listener = (
    _changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName === 'local') cb();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
