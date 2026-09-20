import { RefreshCw, Trash } from 'lucide-react';
import type { OptionsController } from '../hooks/useOptions';

export function NetworkPanel({ ctrl }: { ctrl: OptionsController }): React.JSX.Element {
  return (
    <div className="panel" data-testid="network-panel">
      <div className="banner banner-info">
        Network activity uses <span className="mono">declarativeNetRequest.onRuleMatchedDebug</span>
        , which Chrome only exposes for <strong>unpacked / developer-mode</strong> extensions. It
        lists requests our rules matched (method, URL, type, rule id). Chrome does not expose the
        response status code to extensions, so it is intentionally omitted rather than faked.
      </div>

      <div className="card-head">
        <div className="card-title">Matched requests ({ctrl.activity.length})</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn"
            onClick={() => ctrl.refreshActivity()}
            data-testid="activity-refresh-btn"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            className="btn btn-danger"
            onClick={() => ctrl.clearActivity()}
            data-testid="activity-clear-btn"
          >
            <Trash size={14} /> Clear
          </button>
        </div>
      </div>

      {ctrl.activity.length === 0 ? (
        <div className="card empty" data-testid="activity-empty">
          No matched requests captured yet. Enable CORS, then make a cross-origin request from a
          page to see it here.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Method</th>
                <th>URL</th>
                <th>Type</th>
                <th>Rule</th>
              </tr>
            </thead>
            <tbody>
              {ctrl.activity.map((a) => (
                <tr key={a.id} data-testid={`activity-row-${a.id}`}>
                  <td>{new Date(a.timestamp).toLocaleTimeString()}</td>
                  <td className="method">{a.method}</td>
                  <td style={{ maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.url}
                  </td>
                  <td>{a.type}</td>
                  <td>{a.ruleId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
