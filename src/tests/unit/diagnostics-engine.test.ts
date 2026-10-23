import { describe, it, expect } from 'vitest';
import { DiagnosticsEngine } from '@/engine/diagnostics-engine';
import { DEFAULT_SETTINGS } from '@/shared/constants';
import type { CorsRule } from '@/engine/types';

function rule(partial: Partial<CorsRule>): CorsRule {
  return {
    id: 'r1',
    enabled: true,
    name: 'Test',
    mode: 'domain',
    requestDomains: ['localhost:8080'],
    allowedOrigins: [],
    allowCredentials: false,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

const engine = new DiagnosticsEngine();
const url = 'http://localhost:8080/api/orders';

describe('DiagnosticsEngine.diagnose', () => {
  it('flags an origin mismatch when the rule emits a different specific origin', () => {
    const r = rule({ allowedOrigins: ['http://localhost:3000'] });
    const res = engine.diagnose(
      { url, origin: 'http://localhost:5173' },
      [r],
      DEFAULT_SETTINGS,
      true,
    );
    const check = res.checks.find((c) => c.label === 'Origin mismatch');
    expect(check?.status).toBe('fail');
    expect(res.verdict).toBe('unsupported');
  });

  it('flags an emitted origin with a trailing slash, which the browser rejects', () => {
    const r = rule({ allowedOrigins: ['http://localhost:5173/'] });
    const res = engine.diagnose(
      { url, origin: 'http://localhost:5173' },
      [r],
      DEFAULT_SETTINGS,
      true,
    );
    expect(res.checks.find((c) => c.label === 'Origin mismatch')?.status).toBe('fail');
  });

  it('does not flag a mismatch when the origin matches or the rule emits "*"', () => {
    const exact = rule({ allowedOrigins: ['http://localhost:5173'] });
    const wildcard = rule({ allowedOrigins: [] });
    for (const r of [exact, wildcard]) {
      const res = engine.diagnose(
        { url, origin: 'http://localhost:5173' },
        [r],
        DEFAULT_SETTINGS,
        true,
      );
      expect(res.checks.some((c) => c.label === 'Origin mismatch')).toBe(false);
    }
  });

  it('picks the highest-priority matching rule, as DNR does', () => {
    const low = rule({ id: 'low', name: 'Low', priority: 2 });
    const high = rule({ id: 'high', name: 'High', priority: 5 });
    const res = engine.diagnose({ url }, [low, high], DEFAULT_SETTINGS, true);
    expect(res.matchedRule?.id).toBe('high');
  });

  it('ignores rules that do not apply to fetch/XHR requests', () => {
    const frames = rule({ id: 'frames', priority: 5, resourceTypes: ['main_frame'] });
    const xhr = rule({ id: 'xhr', priority: 2 });
    const res = engine.diagnose({ url }, [frames, xhr], DEFAULT_SETTINGS, true);
    expect(res.matchedRule?.id).toBe('xhr');
  });

  it('warns when two matching rules share the top priority', () => {
    const a = rule({ id: 'a', name: 'A' });
    const b = rule({ id: 'b', name: 'B' });
    const res = engine.diagnose({ url }, [a, b], DEFAULT_SETTINGS, true);
    expect(res.checks.find((c) => c.label === 'Conflicting rules')?.status).toBe('warn');
    expect(res.verdict).toBe('partial');
  });

  it('never reports response modification as confirmed', () => {
    const res = engine.diagnose({ url }, [rule({})], DEFAULT_SETTINGS, true);
    const check = res.checks.find((c) => c.label === 'Response header rules configured');
    expect(check?.status).toBe('info');
    expect(res.summary).not.toMatch(/should succeed/i);
  });
});
