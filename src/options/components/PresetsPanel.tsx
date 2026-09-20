import { Plus } from 'lucide-react';
import { PRESETS } from '@/engine/presets';
import type { OptionsController } from '../hooks/useOptions';

export function PresetsPanel({ ctrl }: { ctrl: OptionsController }): React.JSX.Element {
  return (
    <div className="panel" data-testid="presets-panel">
      <p className="opt-head" style={{ margin: 0 }}>
        <span className="muted">
          Presets are just rule generators — applying one adds a rule you can freely edit or delete.
        </span>
      </p>
      <div className="grid-2">
        {PRESETS.map((preset) => (
          <div className="card card-pad" key={preset.id} data-testid={`preset-${preset.id}`}>
            <div className="card-title">{preset.name}</div>
            <p className="muted" style={{ margin: '6px 0 12px', lineHeight: 1.5 }}>
              {preset.description}
            </p>
            <div className="tags" style={{ marginBottom: 8 }}>
              {preset.origins.map((o) => (
                <span className="pill" key={o} style={{ color: 'var(--accent)' }}>
                  {o}
                </span>
              ))}
            </div>
            <div className="tags" style={{ marginBottom: 14 }}>
              {preset.domains.map((d) => (
                <span className="pill" key={d}>
                  {d}
                </span>
              ))}
            </div>
            <button
              className="btn btn-block"
              onClick={() => ctrl.applyPreset(preset.id)}
              data-testid={`apply-preset-${preset.id}`}
            >
              <Plus size={14} /> Apply preset
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
