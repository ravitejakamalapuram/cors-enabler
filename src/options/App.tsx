import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Gauge,
  ListChecks,
  LayoutGrid,
  Stethoscope,
  Activity,
  SlidersHorizontal,
} from 'lucide-react';
import { useOptions } from './hooks/useOptions';
import { StatusPanel } from './components/StatusPanel';
import { RulesPanel } from './components/RulesPanel';
import { PresetsPanel } from './components/PresetsPanel';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { NetworkPanel } from './components/NetworkPanel';
import { SettingsPanel } from './components/SettingsPanel';
import './options.css';

type Tab = 'status' | 'rules' | 'presets' | 'diagnostics' | 'network' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Gauge; blurb: string }[] = [
  {
    id: 'status',
    label: 'Status',
    icon: Gauge,
    blurb: 'Engine state, installed rules and permission rationale.',
  },
  {
    id: 'rules',
    label: 'Rules',
    icon: ListChecks,
    blurb: 'Create domain / origin specific CORS rules.',
  },
  {
    id: 'presets',
    label: 'Presets',
    icon: LayoutGrid,
    blurb: 'One-click rule sets for common dev stacks.',
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    icon: Stethoscope,
    blurb: 'Simulate a request and see exactly what will happen.',
  },
  {
    id: 'network',
    label: 'Network Activity',
    icon: Activity,
    blurb: 'Requests matched by the engine (dev builds).',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: SlidersHorizontal,
    blurb: 'Credentials, private network, developer mode & limitations.',
  },
];

function initialTab(): Tab {
  const h = window.location.hash.replace('#', '') as Tab;
  return TABS.some((t) => t.id === h) ? h : 'status';
}

export default function App(): React.JSX.Element {
  const ctrl = useOptions();
  const [tab, setTab] = useState<Tab>(initialTab());

  useEffect(() => {
    const onHash = (): void => setTab(initialTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (t: Tab): void => {
    window.location.hash = t;
    setTab(t);
  };

  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="opt-shell" data-testid="options-root">
      <aside className="opt-sidebar">
        <div className="opt-brand">
          <span className="logo" aria-hidden>
            <ShieldCheck size={18} />
          </span>
          CORS Enabler
        </div>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`nav-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => go(t.id)}
              data-testid={`nav-${t.id}`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
        <div className="nav-spacer" />
        <div className="nav-status">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className={`status-dot ${ctrl.status?.enabled ? 'dot-on' : 'dot-off'}`}
              aria-hidden
            />
            <span data-testid="sidebar-state">
              {ctrl.status?.enabled ? 'CORS Enabled' : 'CORS Disabled'}
            </span>
          </div>
        </div>
      </aside>

      <main className="opt-main">
        <div className="opt-head">
          <h1>{active.label}</h1>
          <p>{active.blurb}</p>
        </div>

        {ctrl.error ? (
          <div
            className="banner banner-err"
            style={{ marginBottom: 18 }}
            data-testid="options-error"
          >
            <strong className="mono">{ctrl.error.code}</strong> — {ctrl.error.userMessage}
          </div>
        ) : null}

        {ctrl.loading ? (
          <div className="empty">Loading…</div>
        ) : tab === 'status' ? (
          <StatusPanel ctrl={ctrl} />
        ) : tab === 'rules' ? (
          <RulesPanel ctrl={ctrl} />
        ) : tab === 'presets' ? (
          <PresetsPanel ctrl={ctrl} />
        ) : tab === 'diagnostics' ? (
          <DiagnosticsPanel ctrl={ctrl} />
        ) : tab === 'network' ? (
          <NetworkPanel ctrl={ctrl} />
        ) : (
          <SettingsPanel ctrl={ctrl} />
        )}
      </main>
    </div>
  );
}
