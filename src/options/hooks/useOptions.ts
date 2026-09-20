import { useCallback, useEffect, useState } from 'react';
import { sendMessage } from '@/shared/messages';
import type {
  CorsRule,
  CorsRuleInput,
  CorsSettings,
  CorsStatus,
  DiagnosticRequestInput,
  DiagnosticResult,
  EngineError,
  ExportedConfig,
  NetworkActivityEntry,
} from '@/engine/types';

export function useOptions() {
  const [status, setStatus] = useState<CorsStatus | null>(null);
  const [rules, setRules] = useState<CorsRule[]>([]);
  const [settings, setSettings] = useState<CorsSettings | null>(null);
  const [activity, setActivity] = useState<NetworkActivityEntry[]>([]);
  const [error, setError] = useState<EngineError | null>(null);
  const [loading, setLoading] = useState(true);

  const guard = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      setError(null);
      return await fn();
    } catch (e) {
      setError(e as EngineError);
      return undefined;
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    const s = (await sendMessage({ type: 'CORS_STATUS' })) as CorsStatus;
    setStatus(s);
  }, []);

  const refreshRules = useCallback(async () => {
    setRules((await sendMessage({ type: 'CORS_GET_RULES' })) as CorsRule[]);
  }, []);

  const refreshSettings = useCallback(async () => {
    setSettings((await sendMessage({ type: 'CORS_GET_SETTINGS' })) as CorsSettings);
  }, []);

  const refreshActivity = useCallback(async () => {
    setActivity((await sendMessage({ type: 'CORS_NETWORK_ACTIVITY' })) as NetworkActivityEntry[]);
  }, []);

  useEffect(() => {
    (async () => {
      await guard(async () => {
        await Promise.all([refreshStatus(), refreshRules(), refreshSettings(), refreshActivity()]);
      });
      setLoading(false);
    })();
  }, [guard, refreshStatus, refreshRules, refreshSettings, refreshActivity]);

  const enable = () =>
    guard(async () => setStatus((await sendMessage({ type: 'CORS_ENABLE' })) as CorsStatus));
  const disable = () =>
    guard(async () => setStatus((await sendMessage({ type: 'CORS_DISABLE' })) as CorsStatus));

  const addRule = (payload: CorsRuleInput) =>
    guard(async () => {
      await sendMessage({ type: 'CORS_ADD_RULE', payload });
      await Promise.all([refreshRules(), refreshStatus()]);
    });

  const updateRule = (id: string, rule: Partial<CorsRuleInput>) =>
    guard(async () => {
      setRules(
        (await sendMessage({ type: 'CORS_UPDATE_RULE', payload: { id, rule } })) as CorsRule[],
      );
      await refreshStatus();
    });

  const removeRule = (id: string) =>
    guard(async () => {
      setRules((await sendMessage({ type: 'CORS_REMOVE_RULE', payload: { id } })) as CorsRule[]);
      await refreshStatus();
    });

  const duplicateRule = (id: string) =>
    guard(async () => {
      setRules((await sendMessage({ type: 'CORS_DUPLICATE_RULE', payload: { id } })) as CorsRule[]);
      await refreshStatus();
    });

  const toggleRule = (id: string, enabled: boolean) =>
    guard(async () => {
      setRules(
        (await sendMessage({ type: 'CORS_TOGGLE_RULE', payload: { id, enabled } })) as CorsRule[],
      );
      await refreshStatus();
    });

  const clearRules = () =>
    guard(async () => {
      setRules((await sendMessage({ type: 'CORS_CLEAR_RULES' })) as CorsRule[]);
      await refreshStatus();
    });

  const applyPreset = (presetId: string) =>
    guard(async () => {
      setRules(
        (await sendMessage({ type: 'CORS_APPLY_PRESET', payload: { presetId } })) as CorsRule[],
      );
      await refreshStatus();
    });

  const updateSettings = (patch: Partial<CorsSettings>) =>
    guard(async () => {
      setSettings(
        (await sendMessage({ type: 'CORS_UPDATE_SETTINGS', payload: patch })) as CorsSettings,
      );
      await refreshStatus();
    });

  const diagnose = (payload: DiagnosticRequestInput): Promise<DiagnosticResult | undefined> =>
    guard(async () => (await sendMessage({ type: 'CORS_DIAGNOSE', payload })) as DiagnosticResult);

  const clearActivity = () =>
    guard(async () => {
      setActivity((await sendMessage({ type: 'CORS_CLEAR_ACTIVITY' })) as NetworkActivityEntry[]);
    });

  const exportConfig = (): Promise<ExportedConfig | undefined> =>
    guard(async () => (await sendMessage({ type: 'CORS_EXPORT_CONFIG' })) as ExportedConfig);

  const importConfig = (config: ExportedConfig) =>
    guard(async () => {
      const res = (await sendMessage({ type: 'CORS_IMPORT_CONFIG', payload: config })) as {
        rules: CorsRule[];
        settings: CorsSettings;
      };
      setRules(res.rules);
      setSettings(res.settings);
      await refreshStatus();
    });

  return {
    status,
    rules,
    settings,
    activity,
    error,
    loading,
    enable,
    disable,
    addRule,
    updateRule,
    removeRule,
    duplicateRule,
    toggleRule,
    clearRules,
    applyPreset,
    updateSettings,
    diagnose,
    refreshActivity,
    clearActivity,
    exportConfig,
    importConfig,
    setError,
  };
}

export type OptionsController = ReturnType<typeof useOptions>;
