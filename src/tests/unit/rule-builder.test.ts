import { describe, it, expect } from 'vitest';
import { buildResponseHeaderSpecs } from '@/engine/rule-builder';
import { DEFAULT_SETTINGS } from '@/shared/constants';
import type { CorsRule, CorsSettings } from '@/engine/types';

const settings: CorsSettings = { ...DEFAULT_SETTINGS, allowPrivateNetwork: true };

function rule(partial: Partial<CorsRule>): CorsRule {
  return {
    id: 'r1',
    enabled: true,
    name: 'Test',
    mode: 'domain',
    requestDomains: ['api.example.com'],
    allowedOrigins: [],
    allowCredentials: false,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

function headerMap(specs: { header: string; value?: string }[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const s of specs) m[s.header] = s.value ?? '';
  return m;
}

describe('buildResponseHeaderSpecs — non-credentialed', () => {
  it('emits wildcard ACAO/methods/headers and NO Allow-Credentials', () => {
    const m = headerMap(buildResponseHeaderSpecs(rule({}), settings));
    expect(m['Access-Control-Allow-Origin']).toBe('*');
    expect(m['Access-Control-Allow-Methods']).toBe('*');
    expect(m['Access-Control-Allow-Headers']).toBe('*');
    expect(m['Access-Control-Allow-Credentials']).toBeUndefined();
  });

  it('does NOT set Vary:Origin when origin is "*"', () => {
    const m = headerMap(buildResponseHeaderSpecs(rule({}), settings));
    expect(m['Vary']).toBeUndefined();
  });

  it('includes Private Network header when enabled', () => {
    const m = headerMap(buildResponseHeaderSpecs(rule({}), settings));
    expect(m['Access-Control-Allow-Private-Network']).toBe('true');
  });
});

describe('buildResponseHeaderSpecs — credentialed', () => {
  const credRule = rule({ allowCredentials: true, allowedOrigins: ['http://localhost:3000'] });

  it('never emits "*" for origin/methods/headers', () => {
    const m = headerMap(buildResponseHeaderSpecs(credRule, settings));
    expect(m['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    expect(m['Access-Control-Allow-Origin']).not.toBe('*');
    expect(m['Access-Control-Allow-Methods']).not.toBe('*');
    expect(m['Access-Control-Allow-Headers']).not.toBe('*');
  });

  it('sets Allow-Credentials:true and Vary:Origin', () => {
    const m = headerMap(buildResponseHeaderSpecs(credRule, settings));
    expect(m['Access-Control-Allow-Credentials']).toBe('true');
    expect(m['Vary']).toBe('Origin');
  });
});

describe('buildResponseHeaderSpecs — overrides', () => {
  it('honors explicit methods/headers/expose/maxAge', () => {
    const m = headerMap(
      buildResponseHeaderSpecs(
        rule({
          allowMethods: ['GET', 'POST'],
          allowHeaders: ['X-Api-Key'],
          exposeHeaders: ['X-Total'],
          maxAge: 120,
        }),
        settings,
      ),
    );
    expect(m['Access-Control-Allow-Methods']).toBe('GET, POST');
    expect(m['Access-Control-Allow-Headers']).toBe('X-Api-Key');
    expect(m['Access-Control-Expose-Headers']).toBe('X-Total');
    expect(m['Access-Control-Max-Age']).toBe('120');
  });
});
