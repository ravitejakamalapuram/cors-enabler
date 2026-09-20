import { CORS_HEADERS, DEFAULT_ALLOW_HEADERS, DEFAULT_METHODS } from '@/shared/constants';
import { resolveOriginContext } from '@/engine/cors-validator';
import type { CorsRule, CorsSettings, HeaderSpec } from '@/engine/types';

/**
 * Build the list of response-header mutations for a rule. This encodes the CORS
 * semantics: with credentials we never use "*" for origin/methods/headers,
 * because the browser rejects those combinations.
 */
export function buildResponseHeaderSpecs(rule: CorsRule, settings: CorsSettings): HeaderSpec[] {
  const { credentials, origin } = resolveOriginContext(rule, settings);
  const specs: HeaderSpec[] = [];

  specs.push({ header: CORS_HEADERS.allowOrigin, operation: 'set', value: origin });

  // If we echo a specific origin, tell caches it varies by Origin.
  if (origin !== '*') {
    specs.push({ header: 'Vary', operation: 'set', value: 'Origin' });
  }

  const methods =
    rule.allowMethods && rule.allowMethods.length > 0
      ? rule.allowMethods.join(', ')
      : credentials
        ? DEFAULT_METHODS.join(', ')
        : '*';
  specs.push({ header: CORS_HEADERS.allowMethods, operation: 'set', value: methods });

  const allowHeaders =
    rule.allowHeaders && rule.allowHeaders.length > 0
      ? rule.allowHeaders.join(', ')
      : credentials
        ? DEFAULT_ALLOW_HEADERS.join(', ')
        : '*';
  specs.push({ header: CORS_HEADERS.allowHeaders, operation: 'set', value: allowHeaders });

  const expose =
    rule.exposeHeaders && rule.exposeHeaders.length > 0 ? rule.exposeHeaders.join(', ') : '*';
  specs.push({ header: CORS_HEADERS.exposeHeaders, operation: 'set', value: expose });

  if (credentials) {
    specs.push({ header: CORS_HEADERS.allowCredentials, operation: 'set', value: 'true' });
  }

  specs.push({ header: CORS_HEADERS.maxAge, operation: 'set', value: String(rule.maxAge ?? 600) });

  if (rule.allowPrivateNetwork ?? settings.allowPrivateNetwork) {
    specs.push({ header: CORS_HEADERS.allowPrivateNetwork, operation: 'set', value: 'true' });
  }

  return specs;
}
