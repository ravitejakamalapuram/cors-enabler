export function Switch({
  checked,
  onChange,
  label,
  testid,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  testid?: string;
}): React.JSX.Element {
  return (
    <label className="switch" aria-label={label} title={label}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testid}
        aria-checked={checked}
      />
      <span className="track" />
      <span className="thumb" />
    </label>
  );
}
