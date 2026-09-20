import { GLOBAL_RULE_ID } from '@/shared/constants';
import { presetToRuleInput } from '@/engine/presets';
import type { CorsRule, CorsRuleInput, CorsSettings, NetworkAdapter, Preset } from '@/engine/types';

const now = (): number => Date.now();
const genId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `rule_${Math.random().toString(36).slice(2)}_${now()}`;

/**
 * Owns rule-list transformations and the effective-rule calculation. All CRUD
 * helpers are pure (return new arrays) so they can be unit tested without
 * Chrome. Installation is delegated to the injected NetworkAdapter.
 */
export class RuleManager {
  constructor(private readonly adapter: NetworkAdapter) {}

  createRule(input: CorsRuleInput): CorsRule {
    const ts = now();
    return {
      id: genId(),
      enabled: input.enabled ?? true,
      name: input.name,
      mode: input.mode ?? 'domain',
      requestDomains: input.requestDomains ?? [],
      resourceTypes: input.resourceTypes ?? ['xmlhttprequest'],
      allowedOrigins: input.allowedOrigins ?? [],
      allowCredentials: input.allowCredentials ?? false,
      exposeHeaders: input.exposeHeaders ?? [],
      allowMethods: input.allowMethods ?? [],
      allowHeaders: input.allowHeaders ?? [],
      maxAge: input.maxAge ?? 600,
      allowPrivateNetwork: input.allowPrivateNetwork,
      priority: input.priority ?? 2,
      createdAt: ts,
      updatedAt: ts,
    };
  }

  addRule(rules: CorsRule[], input: CorsRuleInput): { rule: CorsRule; rules: CorsRule[] } {
    const rule = this.createRule(input);
    return { rule, rules: [...rules, rule] };
  }

  updateRule(rules: CorsRule[], id: string, patch: Partial<CorsRuleInput>): CorsRule[] {
    return rules.map((r) => (r.id === id ? { ...r, ...patch, id: r.id, updatedAt: now() } : r));
  }

  removeRule(rules: CorsRule[], id: string): CorsRule[] {
    return rules.filter((r) => r.id !== id);
  }

  duplicateRule(rules: CorsRule[], id: string): CorsRule[] {
    const src = rules.find((r) => r.id === id);
    if (!src) return rules;
    const copy: CorsRule = {
      ...src,
      id: genId(),
      name: `${src.name} (copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    return [...rules, copy];
  }

  toggleRule(rules: CorsRule[], id: string, enabled: boolean): CorsRule[] {
    return rules.map((r) => (r.id === id ? { ...r, enabled, updatedAt: now() } : r));
  }

  applyPreset(rules: CorsRule[], preset: Preset): CorsRule[] {
    const rule = this.createRule(presetToRuleInput(preset));
    return [...rules, rule];
  }

  /** The synthetic global rule installed by the "Enable CORS" switch. */
  buildGlobalRule(settings: CorsSettings): CorsRule {
    return {
      id: GLOBAL_RULE_ID,
      enabled: true,
      name: 'Global CORS (all development APIs)',
      mode: 'global',
      requestDomains: [],
      resourceTypes: ['xmlhttprequest'],
      allowedOrigins: settings.credentialsMode ? [settings.credentialedOrigin] : ['*'],
      allowCredentials: settings.credentialsMode,
      exposeHeaders: [],
      allowMethods: [],
      allowHeaders: [],
      maxAge: 600,
      priority: 1,
      createdAt: 0,
      updatedAt: 0,
    };
  }

  /**
   * Effective rule set = global rule (lowest priority) + enabled user rules
   * (higher priority so they win on overlap).
   */
  computeEffectiveRules(rules: CorsRule[], settings: CorsSettings): CorsRule[] {
    const userRules = rules.filter((r) => r.enabled);
    return [this.buildGlobalRule(settings), ...userRules];
  }

  async install(rules: CorsRule[], settings: CorsSettings): Promise<number[]> {
    const effective = this.computeEffectiveRules(rules, settings);
    const { installedIds } = await this.adapter.sync(effective, settings);
    return installedIds;
  }

  async clear(): Promise<void> {
    await this.adapter.clear();
  }

  async getInstalledIds(): Promise<number[]> {
    return this.adapter.getInstalledIds();
  }
}
