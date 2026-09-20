import { useState } from 'react';
import { Plus, Pencil, Copy, Trash2, Trash } from 'lucide-react';
import { Switch } from '@/ui/components/Switch';
import { RuleEditor } from './RuleEditor';
import type { OptionsController } from '../hooks/useOptions';
import type { CorsRuleInput } from '@/engine/types';

export function RulesPanel({ ctrl }: { ctrl: OptionsController }): React.JSX.Element {
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  const handleSave = async (input: CorsRuleInput): Promise<void> => {
    if (editing === 'new') {
      await ctrl.addRule(input);
    } else if (editing) {
      await ctrl.updateRule(editing, input);
    }
    setEditing(null);
  };

  return (
    <div className="panel" data-testid="rules-panel">
      <div className="card-head">
        <div className="card-title">CORS Rules ({ctrl.rules.length})</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {ctrl.rules.length > 0 ? (
            <button
              className="btn btn-danger"
              onClick={() => ctrl.clearRules()}
              data-testid="clear-rules-btn"
            >
              <Trash size={14} /> Clear all
            </button>
          ) : null}
          <button
            className="btn btn-primary"
            onClick={() => setEditing('new')}
            data-testid="add-rule-btn"
          >
            <Plus size={14} /> Add rule
          </button>
        </div>
      </div>

      {editing === 'new' ? (
        <RuleEditor onSave={handleSave} onCancel={() => setEditing(null)} />
      ) : null}

      {ctrl.rules.length === 0 && editing !== 'new' ? (
        <div className="card empty" data-testid="rules-empty">
          No custom rules yet. The global rule already covers all APIs when CORS is enabled. Add a
          rule for credentialed or domain-specific behaviour, or apply a preset.
        </div>
      ) : null}

      {ctrl.rules.map((rule) =>
        editing === rule.id ? (
          <RuleEditor
            key={rule.id}
            initial={rule}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div className="rule-item" key={rule.id} data-testid={`rule-${rule.id}`}>
            <div className="rule-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Switch
                  checked={rule.enabled}
                  onChange={(v) => ctrl.toggleRule(rule.id, v)}
                  label={`Toggle ${rule.name}`}
                  testid={`rule-toggle-${rule.id}`}
                />
                <span className="rule-name">{rule.name}</span>
                <span className="pill">{rule.mode}</span>
                {rule.allowCredentials ? <span className="pill">credentials</span> : null}
              </div>
              <div className="rule-actions">
                <button
                  className="icon-btn"
                  onClick={() => setEditing(rule.id)}
                  aria-label="Edit rule"
                  data-testid={`rule-edit-${rule.id}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => ctrl.duplicateRule(rule.id)}
                  aria-label="Duplicate rule"
                  data-testid={`rule-duplicate-${rule.id}`}
                >
                  <Copy size={15} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => ctrl.removeRule(rule.id)}
                  aria-label="Delete rule"
                  data-testid={`rule-delete-${rule.id}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className="tags">
              {(rule.requestDomains ?? []).length === 0 ? (
                <span className="pill">all domains</span>
              ) : (
                (rule.requestDomains ?? []).map((d) => (
                  <span className="pill" key={d}>
                    {d}
                  </span>
                ))
              )}
            </div>
            {(rule.allowedOrigins ?? []).length > 0 ? (
              <div className="tags">
                {(rule.allowedOrigins ?? []).map((o) => (
                  <span className="pill" key={o} style={{ color: 'var(--accent)' }}>
                    {o}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ),
      )}
    </div>
  );
}
