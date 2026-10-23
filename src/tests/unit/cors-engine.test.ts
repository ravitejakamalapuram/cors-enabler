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

  it('round-trips initiator scoping through export and import', async () => {
    await engine.updateSettings({ globalInitiatorDomains: ['localhost'] });
    await engine.addRule({
      name: 'Scoped',
      requestDomains: ['a.com'],
      initiatorDomains: ['x.dev'],
    });
    const cfg = JSON.parse(JSON.stringify(await engine.exportConfig())) as ExportedConfig;
    expect(cfg.settings.globalInitiatorDomains).toEqual(['localhost']);
    expect(cfg.rules[0]!.initiatorDomains).toEqual(['x.dev']);

    await engine.updateSettings({ globalInitiatorDomains: [] });
    await engine.clearRules();
    const res = await engine.importConfig(cfg);
    expect(res.settings.globalInitiatorDomains).toEqual(['localhost']);
    expect(res.rules[0]!.initiatorDomains).toEqual(['x.dev']);
  });

  it('imports a config saved before initiator scoping existed', async () => {
    await engine.updateSettings({ globalInitiatorDomains: ['localhost'] });
    const oldSettings: Partial<CorsSettings> = { ...DEFAULT_SETTINGS };
    delete oldSettings.globalInitiatorDomains;
    const oldCfg = {
      schema: 'cors-enabler/v1',
      exportedAt: 0,
      enabled: false,
      // A rule from the old model: no initiatorDomains key.
      rules: [
        { id: 'old', enabled: true, name: 'Old', mode: 'domain', createdAt: 0, updatedAt: 0 },
      ],
      settings: oldSettings,
    } as unknown as ExportedConfig;

    const res = await engine.importConfig(oldCfg);
    expect(res.rules).toHaveLength(1);
    expect(res.settings.globalInitiatorDomains).toEqual([]);
    expect(res.settings.allowPrivateNetwork).toBe(DEFAULT_SETTINGS.allowPrivateNetwork);
    expect((await engine.enable()).state).toBe('ENABLED');
  });

  it('imports a config with no settings block or a malformed initiator list', async () => {
    const base = { schema: 'cors-enabler/v1', exportedAt: 0, enabled: false, rules: [] };
    const noSettings = await engine.importConfig(base as unknown as ExportedConfig);
    expect(noSettings.settings.globalInitiatorDomains).toEqual([]);

    const bad = await engine.importConfig({
      ...base,
      settings: { ...DEFAULT_SETTINGS, globalInitiatorDomains: 'localhost' },
    } as unknown as ExportedConfig);
    expect(bad.settings.globalInitiatorDomains).toEqual([]);
  });

  it('updateSettings stores normalized initiator domains and reinstalls when enabled', async () => {
    await engine.enable();
    const s = await engine.updateSettings({
      globalInitiatorDomains: ['HTTP://Localhost:3000/', 'localhost', ''],
    });
    expect(s.globalInitiatorDomains).toEqual(['localhost']);
    expect(store.settings.globalInitiatorDomains).toEqual(['localhost']);
    expect((await engine.getStatus()).state).toBe('ENABLED');
  });

  it('rejects an invalid global initiator domain without storing it', async () => {
    await engine.updateSettings({ globalInitiatorDomains: ['localhost'] });
    await expect(
      engine.updateSettings({ globalInitiatorDomains: ['*.example.com'] }),
    ).rejects.toMatchObject({ code: 'INVALID_DOMAIN' });
    expect(store.settings.globalInitiatorDomains).toEqual(['localhost']);
    expect((await engine.getSettings()).globalInitiatorDomains).toEqual(['localhost']);
  });

  it('rejects an import whose global initiator domains are invalid', async () => {
    const cfg = await engine.exportConfig();
    cfg.settings.globalInitiatorDomains = ['bad domain'];
    await expect(engine.importConfig(cfg)).rejects.toMatchObject({ code: 'INVALID_DOMAIN' });
    expect(store.settings.globalInitiatorDomains).toEqual([]);
  });

  it('refuses to enable when stored settings hold an invalid initiator domain', async () => {
    store.settings = { ...DEFAULT_SETTINGS, globalInitiatorDomains: ['bad domain'] };
    await engine.initialize();
    const s = await engine.enable();
    expect(s.enabled).toBe(false);
    expect(s.lastError?.code).toBe('INVALID_DOMAIN');
    expect(adapter.installed).toHaveLength(0);
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
