import { describe, it, expect } from 'vitest';
import {
  normalizeOrigin,
  extractHostPort,
  isValidOrigin,
  isValidDomainPattern,
  isLocalhost,
  domainToUrlFilter,
  urlMatchesAny,
} from '@/engine/domain-matcher';

describe('normalizeOrigin', () => {
  it('normalizes full URLs to origin', () => {
    expect(normalizeOrigin('https://api.example.com/users?x=1')).toBe('https://api.example.com');
    expect(normalizeOrigin('http://localhost:3000/path')).toBe('http://localhost:3000');
  });
  it('adds http scheme when missing', () => {
    expect(normalizeOrigin('localhost:5173')).toBe('http://localhost:5173');
  });
  it('returns null for garbage', () => {
    expect(normalizeOrigin('')).toBeNull();
    expect(normalizeOrigin('not a url at all ::::')).toBeNull();
  });
});

describe('extractHostPort', () => {
  it('strips scheme, path and wildcard port', () => {
    expect(extractHostPort('https://api.example.com/v1')).toBe('api.example.com');
    expect(extractHostPort('http://localhost:8080/api')).toBe('localhost:8080');
    expect(extractHostPort('localhost:*')).toBe('localhost');
  });
});

describe('isValidOrigin', () => {
  it('accepts wildcard and valid origins', () => {
    expect(isValidOrigin('*')).toBe(true);
    expect(isValidOrigin('http://localhost:3000')).toBe(true);
    expect(isValidOrigin('https://dev.example.com')).toBe(true);
  });
  it('rejects malformed origins', () => {
    expect(isValidOrigin('example.com')).toBe(false);
    expect(isValidOrigin('ftp://x')).toBe(false);
  });
});

describe('isValidDomainPattern', () => {
  it('accepts host and host:port and wildcard subdomain', () => {
    expect(isValidDomainPattern('api.example.com')).toBe(true);
    expect(isValidDomainPattern('localhost:8080')).toBe(true);
    expect(isValidDomainPattern('*.example.com')).toBe(true);
    expect(isValidDomainPattern('localhost:*')).toBe(true);
  });
  it('rejects invalid patterns', () => {
    expect(isValidDomainPattern('')).toBe(false);
    expect(isValidDomainPattern('has space')).toBe(false);
  });
});

describe('isLocalhost', () => {
  it('detects local hosts', () => {
    expect(isLocalhost('http://localhost:3000')).toBe(true);
    expect(isLocalhost('http://127.0.0.1:8080')).toBe(true);
    expect(isLocalhost('https://api.example.com')).toBe(false);
  });
});

describe('domainToUrlFilter', () => {
  it('anchors portless hosts with a separator', () => {
    expect(domainToUrlFilter('api.example.com')).toBe('||api.example.com^');
  });
  it('keeps explicit ports without a trailing separator', () => {
    expect(domainToUrlFilter('localhost:8080')).toBe('||localhost:8080');
  });
  it('strips wildcard subdomain prefix', () => {
    expect(domainToUrlFilter('*.example.com')).toBe('||example.com^');
  });
});

describe('urlMatchesAny', () => {
  it('matches host and subdomains for portless patterns', () => {
    expect(urlMatchesAny('https://api.example.com/x', ['example.com'])).toBe(true);
    expect(urlMatchesAny('https://example.com/x', ['example.com'])).toBe(true);
  });
  it('requires exact host:port when a port is given', () => {
    expect(urlMatchesAny('http://localhost:8080/x', ['localhost:8080'])).toBe(true);
    expect(urlMatchesAny('http://localhost:3000/x', ['localhost:8080'])).toBe(false);
  });
  it('returns false when nothing matches', () => {
    expect(urlMatchesAny('https://foo.com', ['bar.com'])).toBe(false);
  });
});
