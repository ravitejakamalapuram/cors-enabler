import { Power, Loader2 } from 'lucide-react';
import type { OptionsController } from '../hooks/useOptions';

export function StatusPanel({ ctrl }: { ctrl: OptionsController }): React.JSX.Element {
  const st = ctrl.status;
  const enabled = st?.enabled ?? false;
  const transitioning = st?.state === 'ENABLING' || st?.state === 'DISABLING';

  return (
    <div className="panel" data-testid="status-panel">
      <div className="card card-pad">
        <div className="card-head">
          <div>
            <div className="card-title">Engine</div>
            <div className="muted" style={{ marginTop: 4 }}>
              State:{' '}
              <span className="mono" data-testid="engine-state">
                {st?.state ?? '—'}
              </span>
            </div>
          </div>
          <button
            className={`btn ${enabled ? 'btn-danger' : 'btn-primary'}`}
            disabled={transitioning}
            onClick={() => (enabled ? ctrl.disable() : ctrl.enable())}
            data-testid="status-toggle-btn"
          >
            {transitioning ? <Loader2 size={15} className="enabling-spin" /> : <Power size={15} />}
            {enabled ? 'Disable CORS' : 'Enable CORS'}
          </button>
        </div>
      </div>

      <div className="grid-3">
        <div className="stat">
          <div className="num" data-testid="stat-rules">
            {st?.ruleCount ?? 0}
          </div>
          <div className="cap">Active rules</div>
        </div>
        <div className="stat">
          <div className="num" data-testid="stat-installed">
            {st?.installedRuleIds.length ?? 0}
          </div>
          <div className="cap">Installed DNR rules</div>
        </div>
        <div className="stat">
          <div className="num" data-testid="stat-domains">
            {st?.protectedDomains ?? 0}
          </div>
          <div className="cap">Protected domains</div>
        </div>
      </div>

      {st?.lastError ? (
        <div className="banner banner-err" data-testid="status-error">
          <strong className="mono">{st.lastError.code}</strong>
          <div style={{ marginTop: 4 }}>{st.lastError.userMessage}</div>
        </div>
      ) : null}

      <div className="card card-pad">
        <div className="card-title" style={{ marginBottom: 10 }}>
          Permissions & why they exist
        </div>
        {[
          [
            'storage',
            'Persist enabled state, rules and settings locally. Nothing leaves the browser.',
          ],
          [
            'declarativeNetRequest',
            'Install dynamic rules that add CORS response headers. Chrome evaluates rules internally — the request payload is never exposed to the extension.',
          ],
          [
            'declarativeNetRequestFeedback',
            'Report which rules matched (Network Activity). Functional for unpacked/dev builds only.',
          ],
          [
            'host_permissions: <all_urls>',
            'Modifying response headers requires host access to the request URL. The global "Enable CORS" feature targets arbitrary dev APIs, so broad host access is required. See SECURITY.md.',
          ],
        ].map(([perm, why]) => (
          <div className="cap-row" key={perm}>
            <span className="mono" style={{ color: 'var(--accent)', flex: 'none', minWidth: 200 }}>
              {perm}
            </span>
            <span style={{ color: 'var(--text-dim)', lineHeight: 1.5 }}>{why}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
