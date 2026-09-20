import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Switch } from '@/ui/components/Switch';
import { joinList, parseList } from '../util';
import type { CorsRule, CorsRuleInput, RuleMode } from '@/engine/types';

export function RuleEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CorsRule;
  onSave: (input: CorsRuleInput) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [name, setName] = useState(initial?.name ?? '');
  const [mode, setMode] = useState<RuleMode>(initial?.mode ?? 'domain');
  const [domains, setDomains] = useState(joinList(initial?.requestDomains));
  const [origins, setOrigins] = useState(joinList(initial?.allowedOrigins));
  const [methods, setMethods] = useState(joinList(initial?.allowMethods));
  const [headers, setHeaders] = useState(joinList(initial?.allowHeaders));
  const [expose, setExpose] = useState(joinList(initial?.exposeHeaders));
  const [credentials, setCredentials] = useState(initial?.allowCredentials ?? false);
  const [priority, setPriority] = useState(String(initial?.priority ?? 2));

  const submit = (): void => {
    onSave({
      name: name.trim() || 'Untitled rule',
      mode,
      requestDomains: parseList(domains),
      allowedOrigins: parseList(origins),
      allowMethods: parseList(methods),
      allowHeaders: parseList(headers),
      exposeHeaders: parseList(expose),
      allowCredentials: credentials,
      priority: Number(priority) || 2,
      enabled: initial?.enabled ?? true,
    });
  };

  return (
    <div className="card card-pad" data-testid="rule-editor">
      <div className="form-grid">
        <div className="form-row">
          <label htmlFor="re-name">Rule name</label>
          <input
            id="re-name"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Local Development APIs"
            data-testid="rule-name-input"
          />
        </div>

        <div className="grid-2">
          <div className="form-row">
            <label htmlFor="re-mode">Mode</label>
            <select
              id="re-mode"
              className="select-input"
              value={mode}
              onChange={(e) => setMode(e.target.value as RuleMode)}
              data-testid="rule-mode-select"
            >
              <option value="domain">domain</option>
              <option value="origin">origin</option>
              <option value="global">global</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="re-priority">Priority</label>
            <input
              id="re-priority"
              className="text-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              data-testid="rule-priority-input"
            />
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="re-domains">
            Target API domains (comma separated, supports host:port)
          </label>
          <input
            id="re-domains"
            className="text-input"
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            placeholder="api.example.com, localhost:8080"
            data-testid="rule-domains-input"
          />
        </div>

        <div className="form-row">
          <label htmlFor="re-origins">Allowed origins (first is used for ACAO)</label>
          <input
            id="re-origins"
            className="text-input"
            value={origins}
            onChange={(e) => setOrigins(e.target.value)}
            placeholder="http://localhost:3000"
            data-testid="rule-origins-input"
          />
        </div>

        <div className="settings-row" style={{ padding: '4px 0' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Allow credentials</div>
            <div className="desc">
              Emits a specific origin + Allow-Credentials:true (never “*”).
            </div>
          </div>
          <Switch
            checked={credentials}
            onChange={setCredentials}
            label="Allow credentials"
            testid="rule-credentials-switch"
          />
        </div>

        <div className="grid-2">
          <div className="form-row">
            <label htmlFor="re-methods">Allow methods (blank = auto)</label>
            <input
              id="re-methods"
              className="text-input"
              value={methods}
              onChange={(e) => setMethods(e.target.value)}
              placeholder="GET, POST, PUT"
              data-testid="rule-methods-input"
            />
          </div>
          <div className="form-row">
            <label htmlFor="re-headers">Allow headers (blank = auto)</label>
            <input
              id="re-headers"
              className="text-input"
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              placeholder="Authorization, Content-Type"
              data-testid="rule-headers-input"
            />
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="re-expose">Expose headers</label>
          <input
            id="re-expose"
            className="text-input"
            value={expose}
            onChange={(e) => setExpose(e.target.value)}
            placeholder="X-Total-Count"
            data-testid="rule-expose-input"
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel} data-testid="rule-cancel-btn">
            <X size={14} /> Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} data-testid="rule-save-btn">
            <Save size={14} /> {initial ? 'Update rule' : 'Add rule'}
          </button>
        </div>
      </div>
    </div>
  );
}
