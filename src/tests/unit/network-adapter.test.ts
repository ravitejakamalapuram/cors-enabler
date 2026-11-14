import { describe, it, expect } from 'vitest';
import { ChromeNetworkAdapter } from '@/engine/network-adapter';
import { RuleManager } from '@/engine/rule-manager';
import { DEFAULT_SETTINGS } from '@/shared/constants';
import type { CorsRule, CorsSettings } from '@/engine/types';

const settings: CorsSettings = { ...DEFAULT_SETTINGS };
const adapter = new ChromeNetworkAdapter();

function rule(partial: Partial<CorsRule>): CorsRule {
  return {
    id: 'r',
    enabled: true,
    name: 'T',
    mode: 'domain',
    requestDomains: [],
    allowedOrigins: [],
    allowCredentials: false,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

describe('ChromeNetworkAdapter.buildDnrRules', () => {
  it('builds a single all-URL rule for a global rule (no domains)', () => {
    const dnr = adapter.buildDnrRules([rule({ mode: 'global', requestDomains: [] })], settings);
    expect(dnr).toHaveLength(1);
    expect(dnr[0]!.action.type).toBe('modifyHeaders');
    expect(dnr[0]!.condition.urlFilter).toBeUndefined();
    expect(dnr[0]!.condition.resourceTypes).toContain('xmlhttprequest');
  });

  it('expands a multi-domain rule into one DNR rule per domain with unique ids', () => {
    const dnr = adapter.buildDnrRules(
      [rule({ requestDomains: ['api.example.com', 'localhost:8080'] })],
      settings,
    );
    expect(dnr).toHaveLength(2);
    expect(dnr[0]!.condition.urlFilter).toBe('||api.example.com^');
    expect(dnr[1]!.condition.urlFilter).toBe('||localhost:8080');
    expect(dnr[0]!.id).not.toBe(dnr[1]!.id);
  });

  it('skips disabled rules', () => {
    const dnr = adapter.buildDnrRules(
      [rule({ enabled: false, requestDomains: ['a.com'] })],
      settings,
    );
    expect(dnr).toHaveLength(0);
  });

  it('embeds credentialed response headers correctly', () => {
    const dnr = adapter.buildDnrRules(
      [
        rule({
          allowCredentials: true,
          allowedOrigins: ['http://localhost:3000'],
          requestDomains: ['a.com'],
        }),
      ],
      settings,
    );
    const headers = dnr[0]!.action.responseHeaders ?? [];
    const acao = headers.find((h) => h.header === 'Access-Control-Allow-Origin');
    const acac = headers.find((h) => h.header === 'Access-Control-Allow-Credentials');
    expect(acao?.value).toBe('http://localhost:3000');
    expect(acac?.value).toBe('true');
  });

  it('assigns lower priority to global than domain rules by default', () => {
    const global = adapter.buildDnrRules([rule({ mode: 'global', requestDomains: [] })], settings);
    const domain = adapter.buildDnrRules(
      [rule({ mode: 'domain', requestDomains: ['a.com'] })],
      settings,
    );
    expect(global[0]!.priority).toBeLessThan(domain[0]!.priority!);
  });
});

describe('ChromeNetworkAdapter.buildDnrRules — initiator scoping', () => {
  const manager = new RuleManager(adapter);
  const effective = (s: CorsSettings) =>
    adapter.buildDnrRules(manager.computeEffectiveRules([], s), s);

  it('leaves the global rule unscoped by default (any initiator)', () => {
    const dnr = effective(settings);
    expect(dnr).toHaveLength(1);
    expect(dnr[0]!.condition).not.toHaveProperty('initiatorDomains');
  });

  it('scopes the global rule to globalInitiatorDomains', () => {
    const dnr = effective({ ...settings, globalInitiatorDomains: ['localhost', '127.0.0.1'] });
    expect(dnr).toHaveLength(1);
    expect(dnr[0]!.condition.initiatorDomains).toEqual(['localhost', '127.0.0.1']);
    expect(dnr[0]!.condition.resourceTypes).toContain('xmlhttprequest');
  });

  it('adds initiatorDomains to every condition of a domain rule', () => {
    const dnr = adapter.buildDnrRules(
      [
        rule({
          requestDomains: ['api.example.com', 'localhost:8080'],
          initiatorDomains: ['app.example.com'],
        }),
      ],
      settings,
    );
    expect(dnr).toHaveLength(2);
    expect(dnr[0]!.condition).toMatchObject({
      urlFilter: '||api.example.com^',
      initiatorDomains: ['app.example.com'],
    });
    expect(dnr[1]!.condition).toMatchObject({
      urlFilter: '||localhost:8080',
      initiatorDomains: ['app.example.com'],
    });
  });

  it('normalizes initiator domains for Chrome and omits an effectively empty list', () => {
    const dnr = adapter.buildDnrRules(
      [
        rule({
          requestDomains: ['a.com'],
          initiatorDomains: ['HTTP://Localhost:3000/', 'localhost'],
        }),
        rule({ requestDomains: ['b.com'], initiatorDomains: ['', '  '] }),
      ],
      settings,
    );
    expect(dnr[0]!.condition.initiatorDomains).toEqual(['localhost']);
    expect(dnr[1]!.condition).not.toHaveProperty('initiatorDomains');
  });

  it('does not scope a rule that lacks the field (config from before the field existed)', () => {
    const dnr = adapter.buildDnrRules([rule({ requestDomains: ['a.com'] })], settings);
    expect(dnr[0]!.condition).not.toHaveProperty('initiatorDomains');
  });
});
