import { DNR_RULE_ID_BASE, DNR_UNSAFE_RULE_LIMIT } from '@/shared/constants';
import { domainToUrlFilter } from '@/engine/domain-matcher';
import { buildResponseHeaderSpecs } from '@/engine/rule-builder';
import { rootLogger } from '@/shared/logger';
import type { CorsRule, CorsSettings, NetworkAdapter, ResourceType } from '@/engine/types';

const log = rootLogger.child('NetworkAdapter');

type DnrRule = chrome.declarativeNetRequest.Rule;

/**
 * The only component that talks to chrome.declarativeNetRequest. It converts
 * the browser-agnostic CorsRule model into concrete dynamic DNR rules and
 * guarantees deterministic install/cleanup (spec §26).
 */
export class ChromeNetworkAdapter implements NetworkAdapter {
  /** Convert engine rules into declarativeNetRequest dynamic rules. */
  buildDnrRules(rules: CorsRule[], settings: CorsSettings): DnrRule[] {
    const out: DnrRule[] = [];
    let nextId = DNR_RULE_ID_BASE;

    for (const rule of rules) {
      if (!rule.enabled) continue;
      const responseHeaders = buildResponseHeaderSpecs(rule, settings).map((s) => ({
        header: s.header,
        operation: s.operation as chrome.declarativeNetRequest.HeaderOperation,
        ...(s.value !== undefined ? { value: s.value } : {}),
      }));
      const resourceTypes = (rule.resourceTypes ?? ['xmlhttprequest']) as ResourceType[];
      const domains = rule.requestDomains?.filter(Boolean) ?? [];
      const priority = rule.priority ?? (rule.mode === 'global' ? 1 : 2);

      const conditions: chrome.declarativeNetRequest.RuleCondition[] =
        domains.length === 0
          ? [{ resourceTypes: resourceTypes as chrome.declarativeNetRequest.ResourceType[] }]
          : domains.map((d) => ({
              urlFilter: domainToUrlFilter(d),
              resourceTypes: resourceTypes as chrome.declarativeNetRequest.ResourceType[],
            }));

      for (const condition of conditions) {
        out.push({
          id: nextId++,
          priority,
          action: {
            type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
            responseHeaders,
          },
          condition,
        });
      }
    }
    return out;
  }

  async sync(rules: CorsRule[], settings: CorsSettings): Promise<{ installedIds: number[] }> {
    const dnrRules = this.buildDnrRules(rules, settings);

    if (dnrRules.length > DNR_UNSAFE_RULE_LIMIT) {
      throw {
        code: 'RULE_LIMIT_REACHED',
        message: `Attempted to install ${dnrRules.length} rules; Chrome allows ${DNR_UNSAFE_RULE_LIMIT} unsafe dynamic rules.`,
        userMessage: `Too many rules. Chrome limits header-modifying rules to ${DNR_UNSAFE_RULE_LIMIT}.`,
        recoverable: true,
      };
    }

    const existing = await this.getInstalledIds();
    log.debug(`Removing ${existing.length} stale rules, installing ${dnrRules.length} rules`);

    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existing,
        addRules: dnrRules,
      });
    } catch (e) {
      throw {
        code: 'RULE_INSTALL_FAILED',
        message: `updateDynamicRules failed: ${String(e)}`,
        userMessage: 'Chrome refused to install the network rules. See diagnostics for details.',
        details: e,
        recoverable: true,
      };
    }

    // Verify (spec §26 — never assume success).
    const installed = await this.getInstalledIds();
    log.debug(`Verified ${installed.length} installed rules`);
    return { installedIds: installed };
  }

  async clear(): Promise<void> {
    const existing = await this.getInstalledIds();
    if (existing.length === 0) return;
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existing });
    const remaining = await this.getInstalledIds();
    if (remaining.length > 0) {
      throw {
        code: 'RULE_INSTALL_FAILED',
        message: `Failed to remove all rules; ${remaining.length} remain`,
        userMessage: 'Some network rules could not be removed. Try reloading the extension.',
        recoverable: true,
      };
    }
  }

  async getInstalledIds(): Promise<number[]> {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    return rules.map((r) => r.id);
  }
}
