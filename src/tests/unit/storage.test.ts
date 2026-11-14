import { describe, it, expect, vi } from 'vitest';
import { loadConfig } from '@/shared/storage';
import { DEFAULT_RESOURCE_TYPES, DEFAULT_SETTINGS, STORAGE_KEYS } from '@/shared/constants';

function stored(settings?: Record<string, unknown>): void {
  const get = chrome.storage.local.get as unknown as ReturnType<typeof vi.fn>;
  get.mockResolvedValueOnce(settings ? { [STORAGE_KEYS.settings]: settings } : {});
}

describe('loadConfig settings merge', () => {
  it('uses the defaults when nothing is stored, with Private Network Access off', async () => {
    stored();
    const { settings } = await loadConfig();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.allowPrivateNetwork).toBe(false);
    expect(settings.globalInitiatorDomains).toEqual([]);
  });

  it('keeps a stored allowPrivateNetwork: true (users who already saved settings)', async () => {
    stored({ ...DEFAULT_SETTINGS, allowPrivateNetwork: true });
    expect((await loadConfig()).settings.allowPrivateNetwork).toBe(true);
  });

  it('keeps a stored allowPrivateNetwork: true when the stored object predates other fields', async () => {
    stored({ credentialsMode: true, allowPrivateNetwork: true });
    const { settings } = await loadConfig();
    expect(settings.allowPrivateNetwork).toBe(true);
    expect(settings.credentialsMode).toBe(true);
    expect(settings.globalInitiatorDomains).toEqual([]);
  });

  it('fills the new default for settings stored without allowPrivateNetwork', async () => {
    stored({ credentialsMode: true });
    expect((await loadConfig()).settings.allowPrivateNetwork).toBe(false);
  });

  it('keeps stored globalInitiatorDomains', async () => {
    stored({ globalInitiatorDomains: ['localhost'] });
    expect((await loadConfig()).settings.globalInitiatorDomains).toEqual(['localhost']);
  });
});

describe('loadConfig rule upgrade', () => {
  function storedRules(rules: unknown[]): void {
    const get = chrome.storage.local.get as unknown as ReturnType<typeof vi.fn>;
    get.mockResolvedValueOnce({ [STORAGE_KEYS.rules]: rules });
  }

  it('upgrades a rule saved with the old fetch/XHR-only default', async () => {
    storedRules([{ id: 'a', resourceTypes: ['xmlhttprequest'] }]);
    const { rules } = await loadConfig();
    expect(rules[0]?.resourceTypes).toEqual(DEFAULT_RESOURCE_TYPES);
  });

  it('leaves any other resource type list unchanged', async () => {
    storedRules([{ id: 'b', resourceTypes: ['xmlhttprequest', 'image'] }, { id: 'c' }]);
    const { rules } = await loadConfig();
    expect(rules[0]?.resourceTypes).toEqual(['xmlhttprequest', 'image']);
    expect(rules[1]?.resourceTypes).toBeUndefined();
  });
});
