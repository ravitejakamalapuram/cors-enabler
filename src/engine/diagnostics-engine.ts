import { resolveOriginContext } from '@/engine/cors-validator';
import { isLocalhost, urlMatchesAny } from '@/engine/domain-matcher';
import type {
  CorsRule,
  CorsSettings,
  DiagnosticCheck,
  DiagnosticRequestInput,
  DiagnosticResult,
  NetworkActivityEntry,
} from '@/engine/types';

const SIMPLE_METHODS = new Set(['GET', 'HEAD', 'POST']);

/**
 * Analyses whether a described request can actually succeed given the current
 * rules — and, crucially, surfaces browser-enforced limitations instead of
 * pretending everything works (spec §15/§43).
 */
export class DiagnosticsEngine {
  private activity: NetworkActivityEntry[] = [];

  diagnose(
    input: DiagnosticRequestInput,
    rules: CorsRule[],
    settings: CorsSettings,
    enabled: boolean,
  ): DiagnosticResult {
    const checks: DiagnosticCheck[] = [];
    const limitations: string[] = [];
    const method = (input.method ?? 'GET').toUpperCase();
    const isPreflight = method === 'OPTIONS';
    const withCredentials = Boolean(input.withCredentials);

    const matchedRule =
      rules.find(
        (r) =>
          r.enabled && (!r.requestDomains?.length || urlMatchesAny(input.url, r.requestDomains)),
      ) ?? null;

    // Engine state.
    checks.push({
      label: 'Engine enabled',
      status: enabled ? 'ok' : 'fail',
      detail: enabled ? 'CORS modification is active.' : 'Enable CORS to modify responses.',
    });

    // Rule match.
    checks.push({
      label: 'Extension rule matched',
      status: matchedRule ? 'ok' : 'warn',
      detail: matchedRule
        ? `Matched rule "${matchedRule.name}".`
        : 'No specific rule matched — the global rule (if enabled) applies.',
    });

    // Response modification.
    checks.push({
      label: 'Response header modification',
      status: enabled ? 'ok' : 'fail',
      detail: enabled
        ? 'Access-Control-* response headers are being set via declarativeNetRequest.'
        : 'Not modifying responses while disabled.',
    });

    // Preflight.
    if (isPreflight || !SIMPLE_METHODS.has(method) || this.hasNonSimpleHeaders(input)) {
      checks.push({
        label: 'Preflight (OPTIONS)',
        status: 'warn',
        detail:
          'This is a non-simple request. The browser sends an OPTIONS preflight first. The extension can add CORS headers to the preflight response, but it cannot fabricate a 2xx response if the server returns an error for OPTIONS.',
      });
      limitations.push(
        'Chrome extensions cannot synthesize preflight responses. If the API returns a non-2xx status for OPTIONS, only a local proxy or server fix can help.',
      );
    }

    // Credentials semantics.
    if (withCredentials) {
      const ctx = matchedRule
        ? resolveOriginContext(matchedRule, settings)
        : {
            credentials: settings.credentialsMode,
            origin: settings.credentialedOrigin,
            origins: [],
          };
      if (!ctx.credentials) {
        checks.push({
          label: 'Credentials',
          status: 'fail',
          detail:
            'Request uses credentials but credentials mode is OFF. Enable "Send cookies / credentials" so a specific origin + Allow-Credentials:true is emitted.',
        });
        limitations.push(
          'Credentialed requests require Access-Control-Allow-Origin to be a specific origin (never "*") plus Access-Control-Allow-Credentials:true.',
        );
      } else if (ctx.origin === '*') {
        checks.push({
          label: 'Credentials',
          status: 'fail',
          detail: 'Cannot use "*" origin with credentials. Configure a specific origin.',
        });
      } else {
        checks.push({
          label: 'Credentials',
          status: 'ok',
          detail: `Emitting origin ${ctx.origin} + Allow-Credentials:true.`,
        });
      }
    }

    // Private Network Access.
    if (isLocalhost(input.url) && input.origin && !isLocalhost(input.origin)) {
      checks.push({
        label: 'Private Network Access',
        status: 'warn',
        detail:
          'A public origin is calling a localhost/private API. Chrome may require Access-Control-Allow-Private-Network:true (emitted when PNA is enabled in settings).',
      });
    }

    // Server ACAO already present.
    if (input.hasAcao === false) {
      checks.push({
        label: 'Server CORS headers',
        status: 'info',
        detail: 'Server did not send Access-Control-Allow-Origin; the extension supplies it.',
      });
    }

    const hasFail = checks.some((c) => c.status === 'fail');
    const hasWarn = checks.some((c) => c.status === 'warn');
    const verdict = hasFail ? 'unsupported' : hasWarn ? 'partial' : 'supported';

    const summary = hasFail
      ? 'This request cannot be fully handled with the current configuration. See failing checks.'
      : hasWarn
        ? 'This request is supported with caveats. Review the warnings and limitations.'
        : 'This request should succeed — the extension supplies the required CORS response headers.';

    return { request: input, matchedRule, isPreflight, checks, verdict, summary, limitations };
  }

  private hasNonSimpleHeaders(input: DiagnosticRequestInput): boolean {
    const simple = new Set(['accept', 'accept-language', 'content-language', 'content-type']);
    return (input.requestHeaders ?? []).some((h) => !simple.has(h.toLowerCase()));
  }

  // --- Network activity ring buffer (fed by onRuleMatchedDebug) ---

  addActivity(entry: NetworkActivityEntry, maxEntries: number): void {
    this.activity.unshift(entry);
    if (this.activity.length > maxEntries) {
      this.activity.length = maxEntries;
    }
  }

  getActivity(): NetworkActivityEntry[] {
    return [...this.activity];
  }

  clearActivity(): NetworkActivityEntry[] {
    this.activity = [];
    return [];
  }
}
