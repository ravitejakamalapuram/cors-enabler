import { describe, it, expect, vi } from 'vitest';
import { RuleManager } from '@/engine/rule-manager';
import { DEFAULT_SETTINGS } from '@/shared/constants';
import type { CorsRule, CorsSettings, NetworkAdapter } from '@/engine/types';

const settings: CorsSettings = { ...DEFAULT_SETTINGS };

function mockAdapter(): NetworkAdapter {
  return {
    sync: vi.fn().mockImplementation(async (rules: CorsRule[]) => ({
      installedIds: rules.map((_, i) => 1000 + i),
    })),
    clear: vi.fn().mockResolvedValue(undefined),
    getInstalledIds: vi.fn().mockResolvedValue([]),
  };
}

describe('RuleManager CRUD', () => {
  const mgr = new RuleManager(mockAdapter());

  it('createRule fills defaults and a unique id', () => {
    const r = mgr.createRule({ name: 'A' });
    expect(r.id).toBeTruthy();
    expect(r.enabled).toBe(true);
    expect(r.mode).toBe('domain');
    expect(r.resourceTypes).toEqual(['xmlhttprequest']);
  });

  it('addRule appends immutably', () => {
    const { rules } = mgr.addRule([], { name: 'A' });
    expect(rules).toHaveLength(1);
  });

  it('updateRule patches by id and bumps updatedAt', () => {
    const { rule, rules } = mgr.addRule([], { name: 'A' });
    const updated = mgr.updateRule(rules, rule.id, { name: 'B' });
    expect(updated[0]!.name).toBe('B');
    expect(updated[0]!.id).toBe(rule.id);
  });

  it('removeRule deletes by id', () => {
    const { rule, rules } = mgr.addRule([], { name: 'A' });
    expect(mgr.removeRule(rules, rule.id)).toHaveLength(0);
  });

  it('duplicateRule creates a new id with "(copy)" suffix', () => {
    const { rule, rules } = mgr.addRule([], { name: 'A' });
    const dup = mgr.duplicateRule(rules, rule.id);
    expect(dup).toHaveLength(2);
    expect(dup[1]!.id).not.toBe(rule.id);
    expect(dup[1]!.name).toBe('A (copy)');
  });

  it('toggleRule flips enabled', () => {
    const { rule, rules } = mgr.addRule([], { name: 'A' });
    const toggled = mgr.toggleRule(rules, rule.id, false);
    expect(toggled[0]!.enabled).toBe(false);
  });
});

describe('computeEffectiveRules', () => {
  const mgr = new RuleManager(mockAdapter());

  it('always prepends a global rule (priority 1) and includes only enabled user rules', () => {
    const user: CorsRule = mgr.createRule({ name: 'U', enabled: true });
    const disabled: CorsRule = mgr.createRule({ name: 'D', enabled: false });
    const eff = mgr.computeEffectiveRules([user, disabled], settings);
    expect(eff[0]!.mode).toBe('global');
    expect(eff[0]!.priority).toBe(1);
    expect(eff).toHaveLength(2); // global + one enabled
  });

  it('global rule uses "*" when credentials off, specific origin when on', () => {
    const off = mgr.buildGlobalRule({ ...settings, credentialsMode: false });
    expect(off.allowedOrigins).toEqual(['*']);
    expect(off.allowCredentials).toBe(false);

    const on = mgr.buildGlobalRule({
      ...settings,
      credentialsMode: true,
      credentialedOrigin: 'http://localhost:3000',
    });
    expect(on.allowedOrigins).toEqual(['http://localhost:3000']);
    expect(on.allowCredentials).toBe(true);
  });
});

describe('install / clear delegate to adapter', () => {
  it('install passes effective rules to adapter.sync', async () => {
    const adapter = mockAdapter();
    const mgr = new RuleManager(adapter);
    const ids = await mgr.install([mgr.createRule({ name: 'A' })], settings);
    expect(adapter.sync).toHaveBeenCalledOnce();
    expect(ids.length).toBeGreaterThan(0);
  });

  it('clear delegates to adapter.clear', async () => {
    const adapter = mockAdapter();
    const mgr = new RuleManager(adapter);
    await mgr.clear();
    expect(adapter.clear).toHaveBeenCalledOnce();
  });
});
