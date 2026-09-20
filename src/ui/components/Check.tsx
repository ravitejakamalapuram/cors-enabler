import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { CheckStatus, DiagnosticCheck } from '@/engine/types';

const ICONS = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
  info: Info,
} as const;

const CLASS: Record<CheckStatus, string> = {
  ok: 'c-ok',
  warn: 'c-warn',
  fail: 'c-fail',
  info: 'c-info',
};

export function Check({
  status,
  label,
  detail,
  showDetail = true,
  testid,
}: {
  status: CheckStatus;
  label: string;
  detail?: string;
  showDetail?: boolean;
  testid?: string;
}): React.JSX.Element {
  const Icon = ICONS[status];
  return (
    <div className="check" data-testid={testid}>
      <Icon size={15} className={CLASS[status]} aria-hidden />
      <span>
        <span style={{ color: 'var(--text)' }}>{label}</span>
        {showDetail && detail ? (
          <span style={{ color: 'var(--text-dim)', display: 'block' }}>{detail}</span>
        ) : null}
      </span>
    </div>
  );
}

export function CheckList({ checks }: { checks: DiagnosticCheck[] }): React.JSX.Element {
  return (
    <div data-testid="check-list">
      {checks.map((c, i) => (
        <Check key={i} status={c.status} label={c.label} detail={c.detail} testid={`check-${i}`} />
      ))}
    </div>
  );
}
