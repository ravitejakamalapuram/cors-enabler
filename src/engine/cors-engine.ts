import { DiagnosticsEngine } from '@/engine/diagnostics-engine';
import { RuleManager } from '@/engine/rule-manager';
import { StateMachine } from '@/engine/state-manager';
import { validateRules } from '@/engine/cors-validator';
import { extractHostPort } from '@/engine/domain-matcher';
import { presetById } from '@/engine/presets';
import { rootLogger } from '@/shared/logger';
import type {
  CorsEngineOptions,
  CorsRule,
  CorsRuleInput,
  CorsSettings,
  CorsStatus,
  DiagnosticRequestInput,
  DiagnosticResult,
  EngineError,
  EngineStatus,
  NetworkActivityEntry,
  NetworkAdapter,
  NetworkExtensionEngine,
} from '@/engine/types';

export interface EnginePersistence {
  loadEnabled(): Promise<boolean>;
  saveEnabled(enabled: boolean): Promise<void>;
  loadRules(): Promise<CorsRule[]>;
  saveRules(rules: CorsRule[]): Promise<void>;
  loadSettings(): Promise<CorsSettings>;
  saveSettings(settings: CorsSettings): Promise<void>;
  saveState(state: string): Promise<void>;
  saveLastError(error: EngineError | null): Promise<void>;
}

export interface CorsEngineDeps {
  adapter: NetworkAdapter;
  persistence: EnginePersistence;
}

function toEngineError(e: unknown): EngineError {
  if (e && typeof e === 'object' && 'code' in e && 'userMessage' in e) return e as EngineError;
  return {
    code: 'UNKNOWN',
    message: String(e),
    userMessage: 'An unexpected error occurred.',
    details: e,
    recoverable: true,
  };
}

/**
 * The public CORS Engine. Independent of React and of the messaging layer — it
 * is consumed by the service worker (real deps) and unit tests (mock deps).
 *
 * Implements both the CorsEngine surface and the generic NetworkExtensionEngine
 * contract so future engines can share tooling (spec §23).
 */
export class CorsEngine implements NetworkExtensionEngine {
  private readonly log = rootLogger.child('Engine');
  private readonly rules: RuleManager;
  private readonly diagnostics = new DiagnosticsEngine();
  private readonly state: StateMachine;

  private _rules: CorsRule[] = [];
  private _settings!: CorsSettings;
  private _enabled = false;
  private _installedIds: number[] = [];
  private _lastError: EngineError | null = null;

  /** Serializes enable/disable/sync so concurrent calls can't corrupt DNR state. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly deps: CorsEngineDeps) {
    this.rules = new RuleManager(deps.adapter);
    this.state = new StateMachine('DISABLED', (s) => {
      void this.deps.persistence.saveState(s);
    });
  }

  // --- lifecycle -----------------------------------------------------------

  async initialize(): Promise<void> {
    this._settings = await this.deps.persistence.loadSettings();
    this._rules = await this.deps.persistence.loadRules();
    this._enabled = await this.deps.persistence.loadEnabled();
    rootLogger.configure({
      level: this._settings.logLevel,
      developerMode: this._settings.developerMode,
    });
    this.log.info('Initializing', { enabled: this._enabled, rules: this._rules.length });

    // Re-establish rules after service-worker / Chrome restart (spec §41).
    if (this._enabled) {
      try {
        await this.reinstall();
        this.state.set('ENABLED');
      } catch (e) {
        this._lastError = toEngineError(e);
        this.state.set('ERROR');
        this.log.error('Failed to re-install rules on init', this._lastError);
      }
    } else {
      // Ensure no stale rules survived a crash.
      await this.rules.clear();
      this.state.set('DISABLED');
    }
  }

  private enqueue<T>(op: () => Promise<T>): Promise<T> {
    const run = this.queue.then(op, op);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async reinstall(): Promise<void> {
    const validation = validateRules(this._rules, this._settings);
    if (!validation.valid) {
      throw validation.errors[0];
    }
    this._installedIds = await this.rules.install(this._rules, this._settings);
  }

  // --- CorsEngine API ------------------------------------------------------

  async enable(options?: CorsEngineOptions): Promise<CorsStatus> {
    return this.enqueue(async () => {
      if (options) {
        this._settings = {
          ...this._settings,
          ...(typeof options.credentialsMode === 'boolean'
            ? { credentialsMode: options.credentialsMode }
            : {}),
          ...(options.credentialedOrigin ? { credentialedOrigin: options.credentialedOrigin } : {}),
        };
        await this.deps.persistence.saveSettings(this._settings);
      }
      this.state.dispatch('ENABLE');
      try {
        await this.reinstall();
        this._enabled = true;
        this._lastError = null;
        await this.deps.persistence.saveEnabled(true);
        await this.deps.persistence.saveLastError(null);
        this.state.dispatch('SUCCESS');
        this.log.info('Enabled', { installed: this._installedIds.length });
      } catch (e) {
        this._lastError = toEngineError(e);
        await this.deps.persistence.saveLastError(this._lastError);
        this.state.dispatch('FAILURE');
        this.log.error('Enable failed', this._lastError);
      }
      return this.computeStatus();
    });
  }

  async disable(): Promise<CorsStatus> {
    return this.enqueue(async () => {
      this.state.dispatch('DISABLE');
      try {
        await this.rules.clear();
        this._installedIds = [];
        this._enabled = false;
        this._lastError = null;
        await this.deps.persistence.saveEnabled(false);
        await this.deps.persistence.saveLastError(null);
        this.state.dispatch('SUCCESS');
        this.log.info('Disabled — all rules removed');
      } catch (e) {
        this._lastError = toEngineError(e);
        await this.deps.persistence.saveLastError(this._lastError);
        this.state.dispatch('FAILURE');
        this.log.error('Disable failed', this._lastError);
      }
      return this.computeStatus();
    });
  }

  async isEnabled(): Promise<boolean> {
    return this._enabled;
  }

  async getStatus(): Promise<EngineStatus & CorsStatus> {
    // Reconcile with the browser's actual rule set (never trust cached state).
    this._installedIds = await this.rules.getInstalledIds();
    return this.computeStatus();
  }

  private computeStatus(): CorsStatus & EngineStatus {
    const domains = new Set<string>();
    for (const r of this._rules) {
      if (!r.enabled) continue;
      for (const d of r.requestDomains ?? []) domains.add(extractHostPort(d));
    }
    return {
      state: this.state.current,
      enabled: this._enabled,
      ruleCount: this._rules.filter((r) => r.enabled).length,
      installedRuleIds: this._installedIds,
      protectedDomains: domains.size,
      requestModification: this._enabled, // preflight (OPTIONS) responses are covered
      responseModification: this._enabled,
      credentialsMode: this._settings.credentialsMode,
      developerMode: this._settings.developerMode,
      lastError: this._lastError,
    };
  }

  // --- rules ---------------------------------------------------------------

  async getRules(): Promise<CorsRule[]> {
    return [...this._rules];
  }

  async addRule(input: CorsRuleInput): Promise<{ id: string; rules: CorsRule[] }> {
    return this.enqueue(async () => {
      const { rule, rules } = this.rules.addRule(this._rules, input);
      await this.commitRules(rules);
      return { id: rule.id, rules: [...this._rules] };
    });
  }

  async updateRule(id: string, patch: Partial<CorsRuleInput>): Promise<CorsRule[]> {
    return this.enqueue(async () => {
      if (!this._rules.some((r) => r.id === id)) {
        throw {
          code: 'RULE_NOT_FOUND',
          message: id,
          userMessage: 'Rule not found.',
          recoverable: true,
        };
      }
      await this.commitRules(this.rules.updateRule(this._rules, id, patch));
      return [...this._rules];
    });
  }

  async removeRule(id: string): Promise<CorsRule[]> {
    return this.enqueue(async () => {
      await this.commitRules(this.rules.removeRule(this._rules, id));
      return [...this._rules];
    });
  }

  async duplicateRule(id: string): Promise<CorsRule[]> {
    return this.enqueue(async () => {
      await this.commitRules(this.rules.duplicateRule(this._rules, id));
      return [...this._rules];
    });
  }

  async toggleRule(id: string, enabled: boolean): Promise<CorsRule[]> {
    return this.enqueue(async () => {
      await this.commitRules(this.rules.toggleRule(this._rules, id, enabled));
      return [...this._rules];
    });
  }

  async clearRules(): Promise<CorsRule[]> {
    return this.enqueue(async () => {
      await this.commitRules([]);
      return [...this._rules];
    });
  }

  async applyPreset(presetId: string): Promise<CorsRule[]> {
    return this.enqueue(async () => {
      const preset = presetById(presetId);
      if (!preset) {
        throw {
          code: 'VALIDATION_FAILED',
          message: presetId,
          userMessage: 'Unknown preset.',
          recoverable: true,
        };
      }
      await this.commitRules(this.rules.applyPreset(this._rules, preset));
      return [...this._rules];
    });
  }

  private async commitRules(rules: CorsRule[]): Promise<void> {
    this._rules = rules;
    await this.deps.persistence.saveRules(rules);
    if (this._enabled) {
      await this.reinstall();
    }
  }

  // --- settings ------------------------------------------------------------

  async getSettings(): Promise<CorsSettings> {
    return { ...this._settings };
  }

  async updateSettings(patch: Partial<CorsSettings>): Promise<CorsSettings> {
    return this.enqueue(async () => {
      this._settings = { ...this._settings, ...patch };
      await this.deps.persistence.saveSettings(this._settings);
      rootLogger.configure({
        level: this._settings.logLevel,
        developerMode: this._settings.developerMode,
      });
      if (this._enabled) {
        await this.reinstall();
      }
      return { ...this._settings };
    });
  }

  // --- diagnostics & activity ---------------------------------------------

  async diagnose(request: DiagnosticRequestInput): Promise<DiagnosticResult> {
    return this.diagnostics.diagnose(request, this._rules, this._settings, this._enabled);
  }

  recordActivity(entry: NetworkActivityEntry): void {
    if (this._settings?.captureNetworkActivity) {
      this.diagnostics.addActivity(entry, this._settings.maxActivityEntries);
    }
  }

  getActivity(): NetworkActivityEntry[] {
    return this.diagnostics.getActivity();
  }

  clearActivity(): NetworkActivityEntry[] {
    return this.diagnostics.clearActivity();
  }

  async dispose(): Promise<void> {
    await this.rules.clear();
  }
}
