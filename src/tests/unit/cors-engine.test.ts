import { describe, it, expect, beforeEach } from 'vitest';
import { CorsEngine } from '@/engine/cors-engine';
import { DEFAULT_SETTINGS } from '@/shared/constants';
import type {
  CorsRule,
  CorsSettings,
  EngineError,
  ExportedConfig,
  NetworkAdapter,
} from '@/engine/types';

function makeAdapter(): NetworkAdapter & { installed: number[] } {
  const state = { installed: [] as number[] };
  return {
    get installed() {
      return state.installed;
    },
    sync: async (rules: CorsRule[]) => {
      state.installed = rules.filter((r) => r.enabled).map((_, i) => 1000 + i);
      return { installedIds: state.installed };
    },
    clear: async () => {
      state.installed = [];
    },
    getInstalledIds: async () => state.installed,
  };
}

function makePersistence() {
  const store = {
    enabled: false,
    rules: [] as CorsRule[],
    settings: { ...DEFAULT_SETTINGS } as CorsSettings,
    state: 'DISABLED',
    lastError: null as EngineError | null,
  };
  return {
    store,
    persistence: {
      loadEnabled: async () => store.enabled,
      saveEnabled: async (v: boolean) => void (store.enabled = v),
      loadRules: async () => store.rules,
      saveRules: async (r: CorsRule[]) => void (store.rules = r),
      loadSettings: async () => store.settings,
      saveSettings: async (s: CorsSettings) => void (store.settings = s),
      saveState: async (s: string) => void (store.state = s),
      saveLastError: async (e: EngineError | null) => void (store.lastError = e),
    },
  };
}

describe('CorsEngine orchestration', () => {
  let adapter: ReturnType<typeof makeAdapter>;
  let engine: CorsEngine;
  let store: ReturnType<typeof makePersistence>['store'];

  beforeEach(async () => {
    adapter = makeAdapter();
    const p = makePersistence();
    store = p.store;
    engine = new CorsEngine({ adapter, persistence: p.persistence });
    await engine.initialize();
  });

  it('initializes DISABLED with no installed rules', async () => {
    const s = await engine.getStatus();
    expect(s.state).toBe('DISABLED');
    expect(s.enabled).toBe(false);
    expect(s.installedRuleIds).toHaveLength(0);
  });

  it('enable() installs the global rule and reaches ENABLED', async () => {
    const s = await engine.enable();
    expect(s.enabled).toBe(true);
    expect(s.state).toBe('ENABLED');
    expect(s.installedRuleIds.length).toBeGreaterThanOrEqual(1);
    expect(store.enabled).toBe(true);
  });

  it('adding a rule while enabled reinstalls', async () => {
    await engine.enable();
    const before = adapter.installed.length;
    await engine.addRule({ name: 'API', requestDomains: ['api.example.com'] });
    expect(await engine.getRules()).toHaveLength(1);
    expect(adapter.installed.length).toBeGreaterThan(before);
  });

  it('disable() removes all installed rules and reaches DISABLED', async () => {
    await engine.enable();
    const s = await engine.disable();
    expect(s.enabled).toBe(false);
    expect(s.state).toBe('DISABLED');
    expect(adapter.installed).toHaveLength(0);
  });

  it('serializes concurrent enable/disable without corruption', async () => {
    await Promise.all([engine.enable(), engine.disable(), engine.enable()]);
    const s = await engine.getStatus();
    expect(['ENABLED', 'DISABLED']).toContain(s.state);
    // installed set is consistent with enabled flag
    if (s.enabled) expect(s.installedRuleIds.length).toBeGreaterThanOrEqual(1);
    else expect(s.installedRuleIds).toHaveLength(0);
  });

  it('exports and re-imports configuration (round trip)', async () => {
    await engine.addRule({ name: 'Keep me', requestDomains: ['api.keep.com'] });
    const cfg = await engine.exportConfig();
    expect(cfg.schema).toBe('cors-enabler/v1');
    expect(cfg.rules).toHaveLength(1);

    await engine.clearRules();
    expect(await engine.getRules()).toHaveLength(0);

    const res = await engine.importConfig(cfg);
    expect(res.rules).toHaveLength(1);
    expect(res.rules[0]!.name).toBe('Keep me');
  });

  it('rejects an invalid import schema', async () => {
    await expect(
      engine.importConfig({ schema: 'bogus' } as unknown as ExportedConfig),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('re-installs rules on initialize when previously enabled (restart persistence)', async () => {
    await engine.enable();
    // Simulate a fresh service worker with the same persisted store.
    const adapter2 = makeAdapter();
    const engine2 = new CorsEngine({
      adapter: adapter2,
      persistence: {
        loadEnabled: async () => store.enabled,
        saveEnabled: async (v: boolean) => void (store.enabled = v),
        loadRules: async () => store.rules,
        saveRules: async (r: CorsRule[]) => void (store.rules = r),
        loadSettings: async () => store.settings,
        saveSettings: async (s: CorsSettings) => void (store.settings = s),
        saveState: async () => {},
        saveLastError: async () => {},
      },
    });
    await engine2.initialize();
    const s = await engine2.getStatus();
    expect(s.state).toBe('ENABLED');
    expect(s.installedRuleIds.length).toBeGreaterThanOrEqual(1);
  });
});
