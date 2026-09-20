import { Switch } from '@/ui/components/Switch';
import type { OptionsController } from '../hooks/useOptions';
import type { LogLevel } from '@/engine/types';

const CAPABILITIES: { status: '✓' | '~' | '✗'; cls: string; text: string }[] = [
  {
    status: '✓',
    cls: 'c-ok',
    text: 'Add / override CORS response headers (ACAO, ACAM, ACAH, ACEH, ACAC) via declarativeNetRequest.',
  },
  {
    status: '✓',
    cls: 'c-ok',
    text: 'Apply headers to preflight (OPTIONS) responses returned by the server.',
  },
  {
    status: '✓',
    cls: 'c-ok',
    text: 'Correct credentialed CORS (specific origin + Allow-Credentials:true, never "*").',
  },
  {
    status: '✓',
    cls: 'c-ok',
    text: 'Access-Control-Allow-Private-Network for public→localhost requests.',
  },
  {
    status: '~',
    cls: 'c-warn',
    text: 'Multiple simultaneous credentialed origins — one origin per rule only (Chrome cannot echo the request Origin).',
  },
  {
    status: '~',
    cls: 'c-warn',
    text: 'Network activity inspection — available only for unpacked/dev builds, no response status codes.',
  },
  {
    status: '✗',
    cls: 'c-fail',
    text: 'Fabricate a 2xx preflight response when the server returns an error for OPTIONS.',
  },
  {
    status: '✗',
    cls: 'c-fail',
    text: 'Disable Chromium process-level web security (that requires the --disable-web-security launch flag).',
  },
  {
    status: '✗',
    cls: 'c-fail',
    text: 'Read opaque (no-cors) response bodies — the browser never exposes them to any extension.',
  },
];

export function SettingsPanel({ ctrl }: { ctrl: OptionsController }): React.JSX.Element {
  const s = ctrl.settings;
  if (!s) return <div className="empty">Loading settings…</div>;

  return (
    <div className="panel" data-testid="settings-panel">
      <div className="card card-pad">
        <div className="card-title" style={{ marginBottom: 6 }}>
          CORS behaviour
        </div>
        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Send cookies / credentials</div>
            <div className="desc">
              When on, responses use a specific origin + Access-Control-Allow-Credentials:true. A
              wildcard origin is invalid with credentials, so a concrete origin is required.
            </div>
          </div>
          <Switch
            checked={s.credentialsMode}
            onChange={(v) => ctrl.updateSettings({ credentialsMode: v })}
            label="Credentials mode"
            testid="set-credentials-switch"
          />
        </div>
        {s.credentialsMode ? (
          <div className="form-row" style={{ padding: '4px 0 14px' }}>
            <label htmlFor="cred-origin">Credentialed origin</label>
            <input
              id="cred-origin"
              className="text-input"
              value={s.credentialedOrigin}
              onChange={(e) => ctrl.updateSettings({ credentialedOrigin: e.target.value })}
              data-testid="set-credentialed-origin-input"
            />
          </div>
        ) : null}
        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Allow Private Network Access</div>
            <div className="desc">
              Emit Access-Control-Allow-Private-Network:true so public origins can call
              localhost/private APIs (Chrome PNA).
            </div>
          </div>
          <Switch
            checked={s.allowPrivateNetwork}
            onChange={(v) => ctrl.updateSettings({ allowPrivateNetwork: v })}
            label="Private network"
            testid="set-pna-switch"
          />
        </div>
      </div>

      <div className="card card-pad">
        <div className="card-title" style={{ marginBottom: 6 }}>
          Developer mode
        </div>
        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Verbose diagnostics & logging</div>
            <div className="desc">
              Enables debug logs, installed rule ids and Chrome API errors in the console.
            </div>
          </div>
          <Switch
            checked={s.developerMode}
            onChange={(v) => ctrl.updateSettings({ developerMode: v })}
            label="Developer mode"
            testid="set-devmode-switch"
          />
        </div>
        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Log level</div>
          </div>
          <select
            className="select-input"
            style={{ width: 140 }}
            value={s.logLevel}
            onChange={(e) => ctrl.updateSettings({ logLevel: e.target.value as LogLevel })}
            data-testid="set-loglevel-select"
          >
            {(['debug', 'info', 'warn', 'error'] as LogLevel[]).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Capture network activity</div>
            <div className="desc">Keep a rolling log of matched requests (dev builds only).</div>
          </div>
          <Switch
            checked={s.captureNetworkActivity}
            onChange={(v) => ctrl.updateSettings({ captureNetworkActivity: v })}
            label="Capture activity"
            testid="set-capture-switch"
          />
        </div>
      </div>

      <div className="card card-pad">
        <div className="card-title" style={{ marginBottom: 10 }}>
          What this extension can and cannot do
        </div>
        {CAPABILITIES.map((c, i) => (
          <div className="cap-row" key={i} data-testid={`capability-${i}`}>
            <span className={`cap-badge ${c.cls}`}>{c.status}</span>
            <span style={{ color: 'var(--text-dim)', lineHeight: 1.5 }}>{c.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
