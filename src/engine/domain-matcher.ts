/**
 * Pure domain / origin matching helpers. No chrome APIs — fully unit tested.
 */

/** Normalize a URL or origin-ish string to a canonical origin (scheme://host[:port]). */
export function normalizeOrigin(input: string): string | null {
  if (!input) return null;
  const withScheme = /^[a-z]+:\/\//i.test(input) ? input : `http://${input}`;
  try {
    const u = new URL(withScheme);
    return u.port ? `${u.protocol}//${u.hostname}:${u.port}` : `${u.protocol}//${u.hostname}`;
  } catch {
    return null;
  }
}

/** Extract the host[:port] portion from an arbitrary pattern/URL/origin. */
export function extractHostPort(pattern: string): string {
  let p = pattern.trim();
  p = p.replace(/^[a-z]+:\/\//i, ''); // strip scheme
  p = p.replace(/\/.*$/, ''); // strip path
  p = p.replace(/:\*$/, ''); // strip ":*" wildcard port
  return p;
}

/** True for a well-formed origin (scheme://host[:port]) or the literal "*". */
export function isValidOrigin(origin: string): boolean {
  if (origin === '*') return true;
  if (!/^https?:\/\//i.test(origin)) return false;
  try {
    const u = new URL(origin);
    return Boolean(u.hostname);
  } catch {
    return false;
  }
}

/** True for a host or host:port pattern (also allows leading "*." and trailing ":*"). */
export function isValidDomainPattern(pattern: string): boolean {
  const host = extractHostPort(pattern).replace(/^\*\./, '');
  if (!host) return false;
  // host or host:port
  return /^[a-z0-9.-]+(:\d{1,5})?$/i.test(host);
}

export function isLocalhost(origin: string): boolean {
  const host = extractHostPort(origin);
  const name = host.split(':')[0] ?? '';
  return name === 'localhost' || name === '127.0.0.1' || name === '0.0.0.0' || name === '[::1]';
}

/**
 * Convert a domain pattern into a declarativeNetRequest `urlFilter`.
 * We use urlFilter (not requestDomains) uniformly because requestDomains
 * cannot express ports, which are essential for localhost development.
 */
export function domainToUrlFilter(pattern: string): string {
  const hostPort = extractHostPort(pattern).replace(/^\*\./, '');
  if (hostPort.includes(':')) {
    // Has an explicit port — anchor at domain start, match port + rest.
    return `||${hostPort}`;
  }
  // No port — anchor at domain start, "^" separator also matches ":" so a
  // portless pattern still matches the same host on any port.
  return `||${hostPort}^`;
}

/** True if `url` matches any of the given host/host:port patterns. */
export function urlMatchesAny(url: string, patterns: string[]): boolean {
  const target = normalizeOrigin(url);
  if (!target) return false;
  const targetHostPort = extractHostPort(target);
  const targetHost = targetHostPort.split(':')[0] ?? '';
  return patterns.some((pat) => {
    const patHostPort = extractHostPort(pat).replace(/^\*\./, '');
    const patHost = patHostPort.split(':')[0] ?? '';
    if (patHostPort.includes(':')) return targetHostPort === patHostPort;
    // portless pattern: match host or any subdomain
    return targetHost === patHost || targetHost.endsWith(`.${patHost}`);
  });
}
