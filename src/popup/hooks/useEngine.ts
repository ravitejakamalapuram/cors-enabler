import { useCallback, useEffect, useState } from 'react';
import { sendMessage } from '@/shared/messages';
import { normalizeOrigin } from '@/engine/domain-matcher';
import type { CorsStatus, EngineError } from '@/engine/types';

async function currentTabOrigin(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return null;
    return normalizeOrigin(tab.url);
  } catch {
    return null;
  }
}

export function useEngine() {
  const [status, setStatus] = useState<CorsStatus | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<EngineError | null>(null);

  const refresh = useCallback(async () => {
    const s = (await sendMessage({ type: 'CORS_STATUS' })) as CorsStatus;
    setStatus(s);
    setError(s.lastError ?? null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
        setOrigin(await currentTabOrigin());
      } catch (e) {
        setError(e as EngineError);
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const s = (await sendMessage({ type: 'CORS_ENABLE' })) as CorsStatus;
      setStatus(s);
      if (s.lastError) setError(s.lastError);
    } catch (e) {
      setError(e as EngineError);
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const s = (await sendMessage({ type: 'CORS_DISABLE' })) as CorsStatus;
      setStatus(s);
      if (s.lastError) setError(s.lastError);
    } catch (e) {
      setError(e as EngineError);
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, origin, loading, busy, error, enable, disable, refresh };
}
