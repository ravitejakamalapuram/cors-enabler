import { Settings, Power, Loader2, ShieldCheck, Activity } from 'lucide-react';
import { useEngine } from './hooks/useEngine';
import { Check } from '@/ui/components/Check';
import type { CorsStatus } from '@/engine/types';

function openOptions(hash?: string): void {
  if (hash) {
    void chrome.tabs.create({ url: `${chrome.runtime.getURL('options.html')}#${hash}` });
  } else {
    chrome.runtime.openOptionsPage();
  }
}

function heroLabel(status: CorsStatus | null): { text: string; cls: string; dotCls: string } {
  if (!status) return { text: 'Loading', cls: 'off', dotCls: 'dot-off' };
  switch (status.state) {
    case 'ENABLED':
      return { text: 'CORS Enabled', cls: 'on', dotCls: 'dot-on' };
    case 'ENABLING':
      return { text: 'Enabling…', cls: 'on', dotCls: 'dot-warn' };
    case 'DISABLING':
      return { text: 'Disabling…', cls: 'off', dotCls: 'dot-warn' };
    case 'ERROR':
      return { text: 'Error', cls: 'err', dotCls: 'dot-err' };
    default:
      return { text: 'CORS Disabled', cls: 'off', dotCls: 'dot-off' };
  }
}

export default function App(): React.JSX.Element {
  const { status, origin, loading, busy, error, enable, disable } = useEngine();
  const enabled = status?.enabled ?? false;
  const hero = heroLabel(status);
  const transitioning = status?.state === 'ENABLING' || status?.state === 'DISABLING';

  return (
    <div className="popup" data-testid="popup-root">
      <header className="popup-header">
        <div className="popup-brand">
          <span className="logo" aria-hidden>
            <ShieldCheck size={16} />
          </span>
          CORS Enabler
        </div>
        <button
          className="icon-btn"
          onClick={() => openOptions()}
          aria-label="Open settings"
          data-testid="open-settings-btn"
        >
          <Settings size={17} />
        </button>
      </header>

      <div className="hero">
        <div className={`hero-status ${hero.cls}`} data-testid="hero-status">
          <span className={`big-dot ${hero.dotCls}`} aria-hidden />
          {hero.text}
        </div>

        <button
          className={`btn btn-block ${enabled ? 'btn-danger' : 'btn-primary'}`}
          disabled={loading || busy || transitioning}
          onClick={() => (enabled ? disable() : enable())}
          data-testid="toggle-cors-btn"
        >
          {busy || transitioning ? (
            <Loader2 size={15} className="enabling-spin" />
          ) : (
            <Power size={15} />
          )}
          {enabled ? 'Disable CORS' : 'Enable CORS'}
        </button>
      </div>

      {error ? (
        <div className="section">
          <div className="banner banner-err" data-testid="error-banner">
            <strong className="mono">{error.code}</strong>
            <div style={{ marginTop: 4 }}>{error.userMessage}</div>
          </div>
        </div>
      ) : null}

      {!enabled && !error ? (
        <div className="section">
          <p className="muted" data-testid="disabled-hint" style={{ margin: 0 }}>
            CORS modification is off. Requests use normal browser rules. Click{' '}
            <strong style={{ color: 'var(--text)' }}>Enable CORS</strong> to relax cross-origin
            responses for development.
          </p>
        </div>
      ) : null}

      <div className="section">
        <div className="row">
          <span className="label">Current site</span>
          <span className="kv-value" data-testid="current-origin">
            {origin ?? '—'}
          </span>
        </div>
        <div className="row">
          <span className="label">API rules</span>
          <span className="kv-value" data-testid="rule-count">
            {status?.ruleCount ?? 0} active
          </span>
        </div>
        <div className="row">
          <span className="label">Protected domains</span>
          <span className="kv-value" data-testid="protected-domains">
            {status?.protectedDomains ?? 0}
          </span>
        </div>
        <div className="row">
          <span className="label">Credentials</span>
          <span className="kv-value" data-testid="credentials-mode">
            {status?.credentialsMode ? 'On (specific origin)' : 'Off (wildcard)'}
          </span>
        </div>
      </div>

      <div className="section stack-sm">
        <span className="label">Diagnostics</span>
        <Check
          status={enabled && (status?.installedRuleIds.length ?? 0) > 0 ? 'ok' : 'fail'}
          label="Network rules active"
          showDetail={false}
          testid="diag-network"
        />
        <Check
          status={status?.responseModification ? 'ok' : 'fail'}
          label="Response header modification active"
          showDetail={false}
          testid="diag-response"
        />
        <Check
          status={status?.requestModification ? 'ok' : 'fail'}
          label="Preflight (OPTIONS) handling active"
          showDetail={false}
          testid="diag-preflight"
        />
      </div>

      <div className="footer-actions">
        <button
          className="btn btn-ghost btn-block"
          onClick={() => openOptions('diagnostics')}
          data-testid="open-diagnostics-btn"
        >
          <Activity size={15} /> Open Diagnostics
        </button>
      </div>
    </div>
  );
}
