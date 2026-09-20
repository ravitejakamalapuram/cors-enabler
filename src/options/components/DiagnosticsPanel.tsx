import { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { Switch } from '@/ui/components/Switch';
import { CheckList } from '@/ui/components/Check';
import { parseList } from '../util';
import type { OptionsController } from '../hooks/useOptions';
import type { DiagnosticResult } from '@/engine/types';

const VERDICT_CLASS = {
  supported: 'v-supported',
  partial: 'v-partial',
  unsupported: 'v-unsupported',
} as const;

export function DiagnosticsPanel({ ctrl }: { ctrl: OptionsController }): React.JSX.Element {
  const [url, setUrl] = useState('https://api.example.com/login');
  const [method, setMethod] = useState('POST');
  const [origin, setOrigin] = useState('http://localhost:3000');
  const [headers, setHeaders] = useState('authorization, content-type');
  const [credentials, setCredentials] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const run = async (): Promise<void> => {
    const r = await ctrl.diagnose({
      url,
      method,
      origin,
      withCredentials: credentials,
      requestHeaders: parseList(headers),
    });
    if (r) setResult(r);
  };

  return (
    <div className="panel" data-testid="diagnostics-panel">
      <div className="card card-pad">
        <div className="card-title" style={{ marginBottom: 14 }}>
          Simulate a request
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="d-url">Request URL</label>
            <input
              id="d-url"
              className="text-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="diag-url-input"
            />
          </div>
          <div className="grid-2">
            <div className="form-row">
              <label htmlFor="d-method">Method</label>
              <select
                id="d-method"
                className="select-input"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                data-testid="diag-method-select"
              >
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="d-origin">Origin</label>
              <input
                id="d-origin"
                className="text-input"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                data-testid="diag-origin-input"
              />
            </div>
          </div>
          <div className="form-row">
            <label htmlFor="d-headers">Request headers</label>
            <input
              id="d-headers"
              className="text-input"
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              data-testid="diag-headers-input"
            />
          </div>
          <div className="settings-row" style={{ padding: '4px 0' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>credentials: &quot;include&quot;</div>
            <Switch
              checked={credentials}
              onChange={setCredentials}
              label="With credentials"
              testid="diag-credentials-switch"
            />
          </div>
          <button className="btn btn-primary" onClick={run} data-testid="diag-run-btn">
            <Stethoscope size={15} /> Run diagnostics
          </button>
        </div>
      </div>

      {result ? (
        <div className="card card-pad" data-testid="diag-result">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">Result</div>
            <span className={`verdict ${VERDICT_CLASS[result.verdict]}`} data-testid="diag-verdict">
              {result.verdict}
            </span>
          </div>
          <p className="muted" style={{ lineHeight: 1.55 }} data-testid="diag-summary">
            {result.summary}
          </p>
          <hr className="divider" style={{ margin: '4px 0 14px' }} />
          <CheckList checks={result.checks} />

          {result.limitations.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <span className="label">Browser-enforced limitations</span>
              <div className="stack-sm" style={{ marginTop: 8 }}>
                {result.limitations.map((l, i) => (
                  <div className="banner banner-warn" key={i} data-testid={`diag-limitation-${i}`}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
