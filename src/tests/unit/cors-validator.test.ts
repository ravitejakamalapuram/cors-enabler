import { describe, it, expect } from 'vitest';
import { validateRule, resolveOriginContext } from '@/engine/cors-validator';
import { DEFAULT_SETTINGS } from '@/shared/constants';
import type { CorsRule, CorsSettings } from '@/engine/types';

const settings: CorsSettings = { ...DEFAULT_SETTINGS };

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

describe('resolveOriginContext', () => {
  it('uses "*" for non-credentialed with no specific single origin', () => {
    const ctx = resolveOriginContext(rule({}), settings);
    expect(ctx.origin).toBe('*');
    expect(ctx.credentials).toBe(false);
  });
  it('uses the single specific origin for non-credentialed', () => {
    const ctx = resolveOriginContext(rule({ allowedOrigins: ['http://localhost:3000'] }), settings);
    expect(ctx.origin).toBe('http://localhost:3000');
  });
  it('uses settings.credentialedOrigin when credentialed and none provided', () => {
    const ctx = resolveOriginContext(rule({ allowCredentials: true }), {
      ...settings,
      credentialedOrigin: 'http://localhost:5173',
    });
    expect(ctx.credentials).toBe(true);
    expect(ctx.origin).toBe('http://localhost:5173');
  });
});

describe('validateRule — CORS semantics', () => {
  it('REJECTS "*" + credentials=true (the canonical invalid combination)', () => {
    const res = validateRule(rule({ allowCredentials: true, allowedOrigins: ['*'] }), settings);
    expect(res.valid).toBe(false);
    expect(res.errors.map((e) => e.code)).toContain('INVALID_CREDENTIALED_WILDCARD');
  });

  it('REJECTS credentialed rule with no origin and wildcard settings origin', () => {
    const res = validateRule(rule({ allowCredentials: true }), {
      ...settings,
      credentialedOrigin: '*',
    });
    expect(res.valid).toBe(false);
    expect(res.errors.map((e) => e.code)).toContain('INVALID_CREDENTIALED_WILDCARD');
  });

  it('REJECTS multiple credentialed origins (Chrome cannot echo Origin)', () => {
    const res = validateRule(
      rule({ allowCredentials: true, allowedOrigins: ['http://a.com', 'http://b.com'] }),
      settings,
    );
    expect(res.valid).toBe(false);
    expect(res.errors.map((e) => e.code)).toContain('UNSUPPORTED_CORS_CASE');
  });

  it('ACCEPTS credentialed rule with a single specific origin', () => {
    const res = validateRule(
      rule({ allowCredentials: true, allowedOrigins: ['http://localhost:3000'] }),
      settings,
    );
    expect(res.valid).toBe(true);
  });

  it('ACCEPTS non-credentialed wildcard rule', () => {
    const res = validateRule(rule({ allowedOrigins: ['*'] }), settings);
    expect(res.valid).toBe(true);
  });

  it('REJECTS invalid origin', () => {
    const res = validateRule(rule({ allowedOrigins: ['not-an-origin'] }), settings);
    expect(res.valid).toBe(false);
    expect(res.errors.map((e) => e.code)).toContain('INVALID_ORIGIN');
  });

  it('REJECTS invalid domain', () => {
    const res = validateRule(rule({ requestDomains: ['bad domain'] }), settings);
    expect(res.valid).toBe(false);
    expect(res.errors.map((e) => e.code)).toContain('INVALID_DOMAIN');
  });

  it('REJECTS empty name', () => {
    const res = validateRule(rule({ name: '  ' }), settings);
    expect(res.valid).toBe(false);
    expect(res.errors.map((e) => e.code)).toContain('VALIDATION_FAILED');
  });
});
