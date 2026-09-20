import { isValidDomainPattern, isValidOrigin } from '@/engine/domain-matcher';
import type { CorsRule, CorsSettings, EngineError, ValidationResult } from '@/engine/types';

function err(
  code: EngineError['code'],
  message: string,
  userMessage: string,
  recoverable = true,
): EngineError {
  return { code, message, userMessage, recoverable };
}

/** Resolve the effective ACAO value / credentials flag for a rule + settings. */
export function resolveOriginContext(
  rule: Pick<CorsRule, 'allowCredentials' | 'allowedOrigins'>,
  settings: Pick<CorsSettings, 'credentialsMode' | 'credentialedOrigin'>,
): { credentials: boolean; origin: string; origins: string[] } {
  const credentials = rule.allowCredentials ?? settings.credentialsMode;
  const origins = rule.allowedOrigins?.filter(Boolean) ?? [];
  let origin: string;
  if (credentials) {
    origin = origins[0] ?? settings.credentialedOrigin;
  } else {
    origin = origins.length === 1 && origins[0] !== '*' ? (origins[0] as string) : '*';
  }
  return { credentials, origin, origins };
}

/**
 * Validate a rule against real CORS semantics *and* Chrome API constraints.
 *
 * The canonical invalid case the spec calls out:
 *   Access-Control-Allow-Origin: *  +  Access-Control-Allow-Credentials: true
 * is rejected here.
 */
export function validateRule(rule: CorsRule, settings: CorsSettings): ValidationResult {
  const errors: EngineError[] = [];

  if (!rule.name || !rule.name.trim()) {
    errors.push(err('VALIDATION_FAILED', 'Rule name is empty', 'Please give the rule a name.'));
  }

  const { credentials, origin, origins } = resolveOriginContext(rule, settings);

  // Invalid credentialed wildcard.
  if (credentials && (origin === '*' || !origin)) {
    errors.push(
      err(
        'INVALID_CREDENTIALED_WILDCARD',
        'ACAO "*" is not allowed with Access-Control-Allow-Credentials: true',
        'Credentialed requests require a specific origin (e.g. http://localhost:3000), not "*".',
        true,
      ),
    );
  }

  // Multiple credentialed origins cannot be expressed statically (Chrome cannot
  // echo the request Origin). This is a real, browser-enforced limitation.
  if (credentials && origins.length > 1) {
    errors.push(
      err(
        'UNSUPPORTED_CORS_CASE',
        'Multiple origins with credentials cannot be served by a single static rule',
        'Chrome cannot echo the request Origin. Use one origin per credentialed rule.',
        true,
      ),
    );
  }

  // Validate the chosen origin format (skip when it is the wildcard).
  if (origin !== '*' && !isValidOrigin(origin)) {
    errors.push(
      err('INVALID_ORIGIN', `Invalid origin: ${origin}`, `"${origin}" is not a valid origin.`),
    );
  }

  // Validate declared origins.
  for (const o of origins) {
    if (!isValidOrigin(o)) {
      errors.push(err('INVALID_ORIGIN', `Invalid origin: ${o}`, `"${o}" is not a valid origin.`));
    }
  }

  // Validate domains.
  for (const d of rule.requestDomains ?? []) {
    if (d !== '*' && !isValidDomainPattern(d)) {
      errors.push(
        err('INVALID_DOMAIN', `Invalid domain pattern: ${d}`, `"${d}" is not a valid domain.`),
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Validate a full rule set; returns the first blocking error set found. */
export function validateRules(rules: CorsRule[], settings: CorsSettings): ValidationResult {
  const errors: EngineError[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const res = validateRule(rule, settings);
    errors.push(...res.errors);
  }
  return { valid: errors.length === 0, errors };
}
